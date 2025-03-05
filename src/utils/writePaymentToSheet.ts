import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { config } from "../config";
import { PendingPayment } from "./PendingPaymentsManager";

/**
 * Авторизация и создание экземпляра Google Spreadsheet
 */
async function getSheetsClient(): Promise<GoogleSpreadsheet> {
    const auth = new JWT({
        email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: config.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(config.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo(); // Загружаем информацию о таблице
    return doc;
}

/**
 * Записывает успешный платеж в Google Sheets.
 */
export async function appendSuccessfulPaymentToSheet(
    payment: PendingPayment
): Promise<void> {
    try {
        const doc = await getSheetsClient();
        const sheet = doc.sheetsByTitle["Оплаченные"];
        if (!sheet) throw new Error('❌ Лист "Оплаченные" не найден');

        // Загружаем заголовки
        await sheet.loadHeaderRow();
        const headers = sheet.headerValues;

        // Обрабатываем данные перед записью
        const phoneValue = payment.date.phone.startsWith("+")
            ? `'${payment.date.phone}`
            : payment.date.phone;
        const birthDateValue = payment.date.birth_date
            ? `'${payment.date.birth_date}`
            : "";

        // Объект с названиями колонок, которые у тебя есть
        const rowData: Record<string, string> = {
            "ID платежа & ID товара/услуги": `${payment.paymentId}\n${payment.productId}`,
            "Название & Описание товара/услуги": `${payment.productTitle}\n${payment.productDescription}`,
            "Сумма оплаты": `${payment.amount} ${payment.currency}`,
            "ФИО родителя": payment.date.parent_name || "",
            Email: payment.date.email || "",
            Телефон: phoneValue,
            "ФИО ребёнка": payment.date.child_name || "",
            "Дата рождения": birthDateValue,
            СНИЛС: payment.date.snils || "",
        };

        // Фильтруем только те поля, которые есть в Google Sheets
        const filteredRow = Object.fromEntries(
            Object.entries(rowData).filter(([key]) => headers.includes(key))
        );

        // Добавляем строку в таблицу
        await sheet.addRow(filteredRow);

        console.log(`✅ Платёж ${payment.paymentId} записан в Google Sheets.`);
    } catch (error) {
        console.error("❌ Ошибка при записи в Google Sheets:", error);
        throw error;
    }
}
