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
exports.checkPaymentByUniqueId = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
/**
 * Проверяет статус платежа по `orderId`
 * @param orderId - ID заказа
 * @returns Объект с информацией о платеже или ошибкой
 */
const checkPaymentByUniqueId = (uniqueId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log(`🔍 Проверяем платеж по orderId: ${uniqueId}`);
        const response = yield axios_1.default.get(`${config_1.config.YOOKASSA_API_URL}`, {
            auth: { username: config_1.config.SHOP_ID, password: config_1.config.API_KEY },
            headers: { "Content-Type": "application/json" },
        });
        const payments = response.data.items;
        if (!payments || payments.length === 0) {
            return { error: "❌ Платежи не найдены" };
        }
        // Ищем платеж по orderId
        const payment = payments.find((p) => { var _a; return ((_a = p.metadata) === null || _a === void 0 ? void 0 : _a.uniqueId) === uniqueId; });
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
    }
    catch (error) {
        console.error("❌ Ошибка при проверке платежа:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return { error: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message };
    }
});
exports.checkPaymentByUniqueId = checkPaymentByUniqueId;
