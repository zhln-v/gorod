import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

const PORT: number = Number(process.env.PORT) || 3000;

const BASE_URL: string = process.env["BASE_URL"] || "";
const REDIRECT_URL: string = process.env["REDIRECT_URL"] || "";

const YOOKASSA_API_URL = process.env["YOOKASSA_API_URL"] || "";

const SHOP_ID: string = process.env["TEST-SHOP_ID"] || "";
const API_KEY: string = process.env["TEST-API_KEY"] || "";

// const SHOP_ID: string = process.env["SHOP_ID"] || "";
// const API_KEY: string = process.env["API_KEY"] || "";

const TILDA_API_URL = process.env["TILDA_API_URL"] || "";
const TILDA_PROJECT_ID = process.env["TILDA_PROJECT_ID"] || "";
const TILDA_REC_ID = process.env["TILDA_REC_ID"] || "";
const TILDA_STOREPART_UID = process.env["TILDA_STOREPART_UID"] || "";
const TILDA_API_PUBLIC_KEY = process.env["TILDA_API_PUBLIC_KEY"] || "";
const TILDA_API_SECRET_KEY = process.env["TILDA_API_SECRET_KEY"] || "";

const GOOGLE_SERVICE_ACCOUNT_KEY_FILE =
    process.env["GOOGLE_SERVICE_ACCOUNT_KEY_FILE"] || "";
const GOOGLE_SHEET_ID = process.env["GOOGLE_SHEET_ID"] || "";
const GOOGLE_SHEET_NAME = process.env["GOOGLE_SHEET_NAME"] || "";

// Проверяем, заданы ли все переменные окружения
if (!YOOKASSA_API_URL || !SHOP_ID || !API_KEY || !BASE_URL) {
    console.error(
        "Не заданы переменные окружения YOOKASSA_API_URL, SHOP_ID, API_KEY или REDIRECT_URL"
    );

    logger.error(
        "Не заданы переменные окружения YOOKASSA_API_URL, SHOP_ID, API_KEY или REDIRECT_URL"
    );
}

export const config = {
    PORT,
    YOOKASSA_API_URL,
    BASE_URL,
    SHOP_ID,
    API_KEY,
    TILDA_API_URL,
    TILDA_PROJECT_ID,
    TILDA_API_PUBLIC_KEY,
    TILDA_API_SECRET_KEY,
    TILDA_REC_ID,
    TILDA_STOREPART_UID,
    REDIRECT_URL,
    GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME,
};
