import axios from "axios";
import { config } from "../config";

// Типизация возможных статусов платежа
export type PaymentStatus = "succeeded" | "canceled" | "pending" | "error";

/**
 * Проверяет статус платежа по `paymentId`
 * @param paymentId - ID платежа в Юкассе
 * @returns Строка со статусом платежа
 */
export const checkPaymentStatusByPaymentId = async (
    paymentId: string
): Promise<PaymentStatus> => {
    try {
        const response = await axios.get(
            `${config.YOOKASSA_API_URL}/${paymentId}`,
            {
                auth: { username: config.SHOP_ID, password: config.API_KEY },
            }
        );

        const payment = response.data;

        if (payment.status === "succeeded") {
            return "succeeded";
        }

        if (payment.status === "canceled") {
            return "canceled";
        }

        return "pending";
    } catch (error: any) {
        return "error";
    }
};
