"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingPaymentsManager = void 0;
const node_schedule_1 = __importDefault(require("node-schedule"));
const checkPaymentByPaymentId_1 = require("../services/checkPaymentByPaymentId");
const logger_1 = require("./logger");
const database_1 = __importDefault(require("../database"));
const p_limit_1 = __importDefault(require("p-limit")); // Ограничение запросов
const writePaymentToSheet_1 = require("./writePaymentToSheet");
class PendingPaymentsManager {
    constructor() {
        this.limit = (0, p_limit_1.default)(5); // Одновременно максимум 5 запросов
        this.pendingPayments = new Map();
        this.loadPaymentsFromDB();
        this.startScheduler();
    }
    /**
     * Загружает платежи из SQLite при старте сервера
     */
    loadPaymentsFromDB() {
        const rows = database_1.default.prepare("SELECT * FROM pending_payments").all();
        rows.forEach((row) => {
            const payment = {
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
        logger_1.logger.info(`🔄 Загружено ${rows.length} платежей из БД.`);
    }
    /**
     * Планировщик для проверки платежей каждые 1 минуту (ограничение по запросам)
     */
    startScheduler() {
        node_schedule_1.default.scheduleJob("*/1 * * * *", () => __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info("🔄 Началась проверка незавершённых платежей...");
            const payments = this.getPendingPayments();
            if (payments.length === 0) {
                logger_1.logger.info("✅ Нет ожидающих платежей. Пропускаем проверку.");
                return;
            }
            logger_1.logger.info(`🔍 Найдено ${payments.length} платежей на проверку.`);
            const results = yield Promise.allSettled(payments.map((payment) => this.limit(() => (0, checkPaymentByPaymentId_1.checkPaymentStatusByPaymentId)(payment.paymentId))));
            for (let index = 0; index < results.length; index++) {
                const result = results[index];
                const payment = payments[index];
                if (result.status === "fulfilled") {
                    const statusData = result.value;
                    if (statusData === "succeeded") {
                        try {
                            logger_1.logger.info(`💰 Платёж ${payment.paymentId} подтверждён. Записываем в Google Sheets...`);
                            yield (0, writePaymentToSheet_1.appendSuccessfulPaymentToSheet)(payment);
                            this.removePayment(payment.paymentId);
                            logger_1.logger.info(`✅ Платёж ${payment.paymentId} успешно записан и удалён.`);
                        }
                        catch (err) {
                            logger_1.logger.error(`❌ Ошибка при записи платежа ${payment.paymentId} в Google Sheets: ${err}`);
                        }
                    }
                    else if (statusData === "canceled") {
                        logger_1.logger.info(`❌ Платёж ${payment.paymentId} отменён.`);
                        this.removePayment(payment.paymentId);
                    }
                    else if (statusData === "pending") {
                        logger_1.logger.info(`⏳ Платёж ${payment.paymentId} всё ещё в обработке.`);
                    }
                    else {
                        logger_1.logger.error(`⚠️ Неизвестный статус платежа ${payment.paymentId}: ${statusData}`);
                    }
                }
                else {
                    logger_1.logger.error(`❌ Ошибка при проверке платежа ${payment.paymentId}: ${result.reason}`);
                }
            }
            logger_1.logger.info("✅ Проверка платежей завершена.");
        }));
        logger_1.logger.info("⏳ Планировщик проверки платежей запущен (интервал: 1 мин).");
    }
    /**
     * Добавляет новый платеж в список незавершённых и сохраняет в БД
     */
    addPayment(payment) {
        this.pendingPayments.set(payment.paymentId, payment);
        database_1.default.prepare(`
            INSERT INTO pending_payments 
                (productId, paymentId, productTitle, productDescription, amount, currency, status, createdAt, date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(payment.productId, payment.paymentId, payment.productTitle, payment.productDescription, payment.amount, payment.currency, payment.status, payment.createdAt.toISOString(), JSON.stringify(payment.date) // Сохраняем date как JSON
        );
        logger_1.logger.info(`✅ Платёж ${payment.paymentId} добавлен в очередь и сохранён в БД.`);
    }
    /**
     * Удаляет платеж из списка после успешной оплаты и из БД
     */
    removePayment(paymentId) {
        if (this.pendingPayments.has(paymentId)) {
            this.pendingPayments.delete(paymentId);
            database_1.default.prepare("DELETE FROM pending_payments WHERE paymentId = ?").run(paymentId);
            logger_1.logger.info(`✅ Платёж ${paymentId} удалён из очереди и БД.`);
        }
        else {
            logger_1.logger.warn(`⚠️ Платёж ${paymentId} не найден.`);
        }
    }
    /**
     * Получает все незавершённые платежи
     */
    getPendingPayments() {
        return Array.from(this.pendingPayments.values());
    }
}
// Экспортируем единый экземпляр
exports.pendingPaymentsManager = new PendingPaymentsManager();
