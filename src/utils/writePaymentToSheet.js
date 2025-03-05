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
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendSuccessfulPaymentToSheet = appendSuccessfulPaymentToSheet;
const google_spreadsheet_1 = require("google-spreadsheet");
const google_auth_library_1 = require("google-auth-library");
const config_1 = require("../config");
/**
 * Авторизация и создание экземпляра Google Spreadsheet
 */
function getSheetsClient() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = new google_auth_library_1.JWT({
            email: config_1.config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: config_1.config.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const doc = new google_spreadsheet_1.GoogleSpreadsheet(config_1.config.GOOGLE_SHEET_ID, auth);
        yield doc.loadInfo(); // Загружаем информацию о таблице
        return doc;
    });
}
/**
 * Записывает успешный платеж в Google Sheets.
 */
function appendSuccessfulPaymentToSheet(payment) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const doc = yield getSheetsClient();
            const sheet = doc.sheetsByTitle["Оплаченные"];
            if (!sheet)
                throw new Error('❌ Лист "Оплаченные" не найден');
            // Загружаем заголовки
            yield sheet.loadHeaderRow();
            const headers = sheet.headerValues;
            // Обрабатываем данные перед записью
            const phoneValue = payment.date.phone.startsWith("+")
                ? `'${payment.date.phone}`
                : payment.date.phone;
            const birthDateValue = payment.date.birth_date
                ? `'${payment.date.birth_date}`
                : "";
            // Объект с названиями колонок, которые у тебя есть
            const rowData = {
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
            const filteredRow = Object.fromEntries(Object.entries(rowData).filter(([key]) => headers.includes(key)));
            // Добавляем строку в таблицу
            yield sheet.addRow(filteredRow);
            console.log(`✅ Платёж ${payment.paymentId} записан в Google Sheets.`);
        }
        catch (error) {
            console.error("❌ Ошибка при записи в Google Sheets:", error);
            throw error;
        }
    });
}
