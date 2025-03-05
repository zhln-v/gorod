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
exports.checkPaymentStatusByPaymentId = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
/**
 * Проверяет статус платежа по `paymentId`
 * @param paymentId - ID платежа в Юкассе
 * @returns Строка со статусом платежа
 */
const checkPaymentStatusByPaymentId = (paymentId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(`${config_1.config.YOOKASSA_API_URL}/${paymentId}`, {
            auth: { username: config_1.config.SHOP_ID, password: config_1.config.API_KEY },
        });
        const payment = response.data;
        if (payment.status === "succeeded") {
            return "succeeded";
        }
        if (payment.status === "canceled") {
            return "canceled";
        }
        return "pending";
    }
    catch (error) {
        return "error";
    }
});
exports.checkPaymentStatusByPaymentId = checkPaymentStatusByPaymentId;
