import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// import { createPayment } from "./src/routes/createPayment";
import { checkPayment } from "./src/routes/checkPayment";

import { pendingPaymentsManager } from "./src/utils/PendingPaymentsManager";
import { config } from "./src/config";
import { logger } from "./src/utils/logger";
import { createPayment } from "./src/routes/newCreatePayment";

dotenv.config();

const app = express();
const PORT: number = Number(config.PORT) || 3000;

pendingPaymentsManager;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Роуты
app.use("/createPayment", createPayment);
app.use("/checkPayment", checkPayment);

app.listen(PORT, () => {
    logger.info(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
