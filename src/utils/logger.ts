import winston from "winston";
import fs from "fs";
import path from "path";

// 📁 Создаем директорию для логов, если её нет
const logDir = "logs";
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// ⚡ Форматирование логов
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level}]: ${message}`;
    })
);

const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// 🚀 Конфигурация логгера
export const logger = winston.createLogger({
    level: "debug", // Устанавливаем уровень логирования (можно "info")
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // 🔴 Файл ошибок
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            format: fileFormat,
        }),
        // 🔵 Общий лог
        new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
            format: fileFormat,
        }),
        // 🖥️ Вывод в консоль с цветами
        new winston.transports.Console({
            format: consoleFormat,
        }),
    ],
});
