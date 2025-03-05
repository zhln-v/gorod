"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// import { createPayment } from "./src/routes/createPayment";
const checkPayment_1 = require("./src/routes/checkPayment");
const PendingPaymentsManager_1 = require("./src/utils/PendingPaymentsManager");
const config_1 = require("./src/config");
const logger_1 = require("./src/utils/logger");
const newCreatePayment_1 = require("./src/routes/newCreatePayment");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(config_1.config.PORT) || 3000;
PendingPaymentsManager_1.pendingPaymentsManager;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)());
// Роуты
app.use("/createPayment", newCreatePayment_1.createPayment);
app.use("/checkPayment", checkPayment_1.checkPayment);
app.listen(PORT, () => {
    logger_1.logger.info(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
