import { google } from "googleapis";
import { config } from "../config";
import { PendingPayment } from "./PendingPaymentsManager";

/**
 * Добавляет успешный платеж в Google Sheets.
 *
 * Функция использует сервисный аккаунт для доступа к Google Sheets API и добавляет новую строку с данными платежа.
 *
 * @param {PendingPayment} payment - Объект успешного платежа.
 * @returns {Promise<any>} - Результат операции записи в Google Sheets.
 *
 */
export async function appendSuccessfulPaymentToSheet(
    payment: PendingPayment
): Promise<any> {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: config.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const sheets = google.sheets({ version: "v4", auth });
        const spreadsheetId = config.GOOGLE_SHEET_ID;
        const sheetName = "Оплаченные";
        // Используем диапазон без оборачивания имени листа в кавычки, если имя не содержит пробелов или спецсимволов
        const range = `${sheetName}!A1`;

        // Если номер телефона начинается с плюса, добавляем апостроф, чтобы Sheets воспринимал его как текст
        const phoneValue =
            payment.date.phone && payment.date.phone.startsWith("+")
                ? "'" + payment.date.phone
                : String(payment.date.phone || "");

        const birthDateValue = payment.date.birth_date
            ? `'${payment.date.birth_date}'` // Добавляем апостроф перед датой
            : "";

        const row = [
            `${payment.paymentId}\n${payment.productId}`,
            `${payment.productTitle}\n${payment.productDescription}`,
            `${payment.amount} ${payment.currency}`,
            payment.date.parent_name || "",
            payment.date.email || "",
            phoneValue,
            payment.date.child_name || "",
            birthDateValue,
            payment.date.snils || "",
        ];

        const result = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [row],
            },
        });

        return result.data;
    } catch (error) {
        console.error("Ошибка при записи платежа в Google Sheets:", error);
        throw error;
    }
}
