import schedule from "node-schedule";
import { checkPaymentStatusByPaymentId } from "../services/checkPaymentByPaymentId";
import { logger } from "./logger";
import db from "../database";
import pLimit from "p-limit"; // Ограничение запросов
import { appendSuccessfulPaymentToSheet } from "./writePaymentToSheet";

export interface PendingPayment {
    productId: string;
    paymentId: string;
    productTitle: string;
    productDescription: string;
    amount: string;
    currency: string;
    status: string;
    createdAt: Date;
    date: {
        parent_name: string;
        email: string;
        phone: string;
        child_name: string;
        birth_date: string;
        snils: string;
    };
}

class PendingPaymentsManager {
    private pendingPayments: Map<string, PendingPayment>;
    private limit = pLimit(5); // Одновременно максимум 5 запросов

    constructor() {
        this.pendingPayments = new Map();
        this.loadPaymentsFromDB();
        this.startScheduler();
    }

    /**
     * Загружает платежи из SQLite при старте сервера
     */
    private loadPaymentsFromDB(): void {
        const rows = db.prepare("SELECT * FROM pending_payments").all();
        rows.forEach((row: any) => {
            const payment: PendingPayment = {
                productId: row.productId,
                paymentId: row.paymentId,
                productTitle: row.productTitle,
                productDescription: row.productDescription,
                amount: row.amount,
                currency: row.currency,
                status: row.status,
                createdAt: new Date(row.createdAt),
                date: row.date ? JSON.parse(row.date) : {}, // Распаковываем JSON
            };
            this.pendingPayments.set(row.paymentId, payment);
        });
        logger.info(`🔄 Загружено ${rows.length} платежей из БД.`);
    }

    /**
     * Планировщик для проверки платежей каждые 1 минуту (ограничение по запросам)
     */
    private startScheduler(): void {
        schedule.scheduleJob("*/1 * * * *", async () => {
            logger.info("🔄 Началась проверка незавершённых платежей...");

            const payments = this.getPendingPayments();
            if (payments.length === 0) {
                logger.info("✅ Нет ожидающих платежей. Пропускаем проверку.");
                return;
            }

            logger.info(`🔍 Найдено ${payments.length} платежей на проверку.`);

            const results = await Promise.allSettled(
                payments.map((payment) =>
                    this.limit(() =>
                        checkPaymentStatusByPaymentId(payment.paymentId)
                    )
                )
            );

            for (let index = 0; index < results.length; index++) {
                const result = results[index];
                const payment = payments[index];

                if (result.status === "fulfilled") {
                    const statusData = result.value;

                    if (statusData === "succeeded") {
                        try {
                            logger.info(
                                `💰 Платёж ${payment.paymentId} подтверждён. Записываем в Google Sheets...`
                            );
                            await appendSuccessfulPaymentToSheet(payment);
                            this.removePayment(payment.paymentId);
                            logger.info(
                                `✅ Платёж ${payment.paymentId} успешно записан и удалён.`
                            );
                        } catch (err) {
                            logger.error(
                                `❌ Ошибка при записи платежа ${payment.paymentId} в Google Sheets: ${err}`
                            );
                        }
                    } else if (statusData === "canceled") {
                        logger.info(`❌ Платёж ${payment.paymentId} отменён.`);
                        this.removePayment(payment.paymentId);
                    } else if (statusData === "pending") {
                        logger.info(
                            `⏳ Платёж ${payment.paymentId} всё ещё в обработке.`
                        );
                    } else {
                        logger.error(
                            `⚠️ Неизвестный статус платежа ${payment.paymentId}: ${statusData}`
                        );
                    }
                } else {
                    logger.error(
                        `❌ Ошибка при проверке платежа ${payment.paymentId}: ${result.reason}`
                    );
                }
            }

            logger.info("✅ Проверка платежей завершена.");
        });

        logger.info(
            "⏳ Планировщик проверки платежей запущен (интервал: 1 мин)."
        );
    }

    /**
     * Добавляет новый платеж в список незавершённых и сохраняет в БД
     */
    addPayment(payment: PendingPayment): void {
        this.pendingPayments.set(payment.paymentId, payment);
        db.prepare(
            `
            INSERT INTO pending_payments 
                (productId, paymentId, productTitle, productDescription, amount, currency, status, createdAt, date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
        ).run(
            payment.productId,
            payment.paymentId,
            payment.productTitle,
            payment.productDescription,
            payment.amount,
            payment.currency,
            payment.status,
            payment.createdAt.toISOString(),
            JSON.stringify(payment.date) // Сохраняем date как JSON
        );
        logger.info(
            `✅ Платёж ${payment.paymentId} добавлен в очередь и сохранён в БД.`
        );
    }

    /**
     * Удаляет платеж из списка после успешной оплаты и из БД
     */
    removePayment(paymentId: string): void {
        if (this.pendingPayments.has(paymentId)) {
            this.pendingPayments.delete(paymentId);
            db.prepare("DELETE FROM pending_payments WHERE paymentId = ?").run(
                paymentId
            );
            logger.info(`✅ Платёж ${paymentId} удалён из очереди и БД.`);
        } else {
            logger.warn(`⚠️ Платёж ${paymentId} не найден.`);
        }
    }

    /**
     * Получает все незавершённые платежи
     */
    getPendingPayments(): PendingPayment[] {
        return Array.from(this.pendingPayments.values());
    }
}

// Экспортируем единый экземпляр
export const pendingPaymentsManager = new PendingPaymentsManager();
