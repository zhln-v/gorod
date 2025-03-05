import express from "express";
import cors from "cors";

import { createPayment } from "./routes/createPayment";
// import { createPayment } from "./routes/newCreatePayment"; // Оплата сертификатом

import { checkPayment } from "./routes/checkPayment";
import { pendingPaymentsManager } from "./utils/PendingPaymentsManager";
import { config } from "./config";
import { logger } from "./utils/logger";

const app = express();
const PORT: number = Number(config.PORT) || 3000;

pendingPaymentsManager;

app.use(express.json()); // парсит application/json
app.use(express.urlencoded({ extended: true })); // парсит application/x-www-form-urlencoded
app.use(cors());

// Роуты
app.use("/createPayment", createPayment); // Создаём платёж

/**
 * Принимает параметры orderId
 * Проверяет статус платёжа в том случае, если пользователь переходит по ссылке после оплаты
 * Платёж проверяется по uuid
 */
app.use("/checkPayment", checkPayment);

// app.use("/sendOrderData", );

app.listen(PORT, () => {
    logger.info(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
