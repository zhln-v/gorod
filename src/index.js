"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const createPayment_1 = require("./routes/createPayment");
// import { createPayment } from "./routes/newCreatePayment"; // Оплата сертификатом
const checkPayment_1 = require("./routes/checkPayment");
const PendingPaymentsManager_1 = require("./utils/PendingPaymentsManager");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
const PORT = Number(config_1.config.PORT) || 3000;
PendingPaymentsManager_1.pendingPaymentsManager;
app.use(express_1.default.json()); // парсит application/json
app.use(express_1.default.urlencoded({ extended: true })); // парсит application/x-www-form-urlencoded
app.use((0, cors_1.default)());
// Роуты
app.use("/createPayment", createPayment_1.createPayment); // Создаём платёж
/**
 * Принимает параметры orderId
 * Проверяет статус платёжа в том случае, если пользователь переходит по ссылке после оплаты
 * Платёж проверяется по uuid
 */
app.use("/checkPayment", checkPayment_1.checkPayment);
// app.use("/sendOrderData", );
setInterval(() => {
    const memory = process.memoryUsage();
    console.log(`Heap used: ${Math.round(memory.heapUsed / 1024 / 1024)} MB`);
}, 1000); // каждые 5 секунд
app.listen(PORT, () => {
    logger_1.logger.info(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
