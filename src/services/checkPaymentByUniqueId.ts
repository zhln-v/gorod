import axios from "axios";
import { config } from "../config";

/**
 * Проверяет статус платежа по `orderId`
 * @param orderId - ID заказа
 * @returns Объект с информацией о платеже или ошибкой
 */
export const checkPaymentByUniqueId = async (uniqueId: string) => {
    try {
        console.log(`🔍 Проверяем платеж по orderId: ${uniqueId}`);

        const response = await axios.get(`${config.YOOKASSA_API_URL}`, {
            auth: { username: config.SHOP_ID, password: config.API_KEY },
            headers: { "Content-Type": "application/json" },
        });

        const payments = response.data.items;

        if (!payments || payments.length === 0) {
            return { error: "❌ Платежи не найдены" };
        }

        // Ищем платеж по orderId
        const payment = payments.find(
            (p: any) => p.metadata?.uniqueId === uniqueId
        );

        if (!payment) {
            return { error: "❌ Платеж не найден" };
        }

        console.log(`✅ Найден платеж ${uniqueId}, статус: ${payment.status}`);

        return {
            uniqueId,
            paymentId: payment.id,
            status: payment.status,
            amount: payment.amount.value,
            currency: payment.amount.currency,
        };
    } catch (error: any) {
        console.error(
            "❌ Ошибка при проверке платежа:",
            error.response?.data || error.message
        );
        return { error: error.response?.data || error.message };
    }
};
