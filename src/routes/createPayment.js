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
exports.createPayment = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const PendingPaymentsManager_1 = require("../utils/PendingPaymentsManager");
const config_1 = require("../config");
const getOriginalProduct_1 = require("../utils/getOriginalProduct");
const router = express_1.default.Router();
exports.createPayment = router;
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { productId, Receipt, parentName, childName, birthDate, snils, email, phone, } = req.body;
        logger_1.logger.info("🚀 Получен запрос на создание платежа", {
            productId,
            parentName,
            childName,
            birthDate,
            snils,
            email,
            phone,
        });
        if (!productId) {
            logger_1.logger.error("❌ Ошибка: отсутствует productId");
            res.status(400).json({
                status: "error",
                message: "Не хватает обязательных полей (productId).",
            });
        }
        logger_1.logger.info(`🔍 Запрос к Tilda API для получения данных товара ${productId}`);
        // Получаем данные товара по id
        const productData = yield (0, getOriginalProduct_1.getOriginalProduct)(productId);
        logger_1.logger.info("📦 Данные товара получены:", productData);
        const productInfo = productData && productData.uid
            ? productData
            : (_a = productData.products) === null || _a === void 0 ? void 0 : _a[0];
        if (!productInfo) {
            logger_1.logger.error(`❌ Ошибка: Товар с ID ${productId} не найден`);
            res.status(400).json({
                status: "error",
                message: "Товар не найден!",
            });
        }
        // Получаем и проверяем цену
        const originalPrice = parseFloat(productInfo.price);
        if (isNaN(originalPrice) || originalPrice <= 0) {
            logger_1.logger.error(`❌ Ошибка: Неверная цена товара (${productInfo.price})`);
            res.status(400).json({
                status: "error",
                message: "Неверная цена товара.",
            });
        }
        // Формируем название и описание платежа
        const title = productInfo.title || "Товар";
        const fullDescription = title;
        logger_1.logger.info("✅ Характеристики товара:", {
            title,
            description: productInfo.descr || "Нет описания",
            price: originalPrice,
        });
        // Используем проверенную цену
        const amountValue = originalPrice;
        let parsedReceipt;
        if (Receipt) {
            try {
                parsedReceipt = JSON.parse(Receipt);
                logger_1.logger.info("✅ Receipt успешно распарсен");
            }
            catch (e) {
                logger_1.logger.warn("⚠️ Ошибка парсинга Receipt", { error: e });
            }
        }
        const idempotenceKey = (0, uuid_1.v4)();
        // Формируем данные для платежа через YooKassa
        const paymentData = {
            amount: {
                value: amountValue,
                currency: "RUB",
            },
            confirmation: {
                type: "redirect",
                return_url: `${config_1.config.REDIRECT_URL}`,
            },
            capture: true,
            description: fullDescription,
            metadata: {
                uniqueId: idempotenceKey,
                productId: productId,
            },
        };
        if (parsedReceipt && parsedReceipt.items && parsedReceipt.taxation) {
            const items = parsedReceipt.items.map((item) => ({
                description: item.name,
                quantity: item.quantity,
                amount: { value: parseFloat(item.price), currency: "RUB" },
                vat_code: 1,
            }));
            paymentData.receipt = {
                items,
                taxation: parsedReceipt.taxation,
            };
        }
        logger_1.logger.info("📤 Отправка запроса на оплату в YooKassa...", {
            paymentData,
        });
        // Создаем платеж через YooKassa
        const responseYk = yield axios_1.default.post(config_1.config.YOOKASSA_API_URL, paymentData, {
            auth: {
                username: config_1.config.SHOP_ID,
                password: config_1.config.API_KEY,
            },
            headers: {
                "Content-Type": "application/json",
                "Idempotence-Key": idempotenceKey,
            },
        });
        const paymentUrl = responseYk.data.confirmation.confirmation_url;
        logger_1.logger.info(`✅ Платёж успешно создан, ссылка на оплату: ${paymentUrl}`);
        // Добавляем платеж в менеджер отложенных платежей
        PendingPaymentsManager_1.pendingPaymentsManager.addPayment({
            productId: productId,
            productTitle: title,
            productDescription: productInfo.descr || "",
            paymentId: responseYk.data.id,
            amount: responseYk.data.amount.value,
            currency: responseYk.data.amount.currency,
            status: responseYk.data.status,
            createdAt: new Date(),
            date: {
                parent_name: parentName,
                email: email,
                phone: phone,
                child_name: childName,
                birth_date: birthDate,
                snils: snils,
            },
        });
        logger_1.logger.info(`✅ Платёж ${responseYk.data.id} добавлен в очередь на проверку`);
        // Отправляем клиенту ссылку на оплату и успешный статус
        res.json({
            status: "success",
            redirect: paymentUrl,
        });
    }
    catch (error) {
        logger_1.logger.error("❌ Ошибка при создании платежа:", {
            error: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message,
        });
        res.status(500).json({
            status: "error",
            message: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message,
        });
    }
}));
