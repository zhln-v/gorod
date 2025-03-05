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
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        logger_1.logger.info("🚀 Получен запрос на создание платежа", req.body);
        const { productId, Receipt } = req.body;
        if (!productId) {
            logger_1.logger.error("❌ Ошибка: отсутствует productId в запросе");
            res.status(400).json({
                status: "error",
                message: "Не хватает обязательных полей (productId).",
            });
        }
        // Получаем данные товара по ID
        logger_1.logger.info(`🔍 Запрос к Tilda API для получения данных товара ${productId}`);
        const productData = yield (0, getOriginalProduct_1.getOriginalProduct)(productId);
        logger_1.logger.info("📦 Данные товара получены:", productData);
        const productInfo = (productData === null || productData === void 0 ? void 0 : productData.uid)
            ? productData
            : (_a = productData.products) === null || _a === void 0 ? void 0 : _a[0];
        if (!productInfo) {
            logger_1.logger.error("❌ Ошибка: товар не найден!", productData);
            res.status(400).json({
                status: "error",
                message: "Товар не найден!",
            });
        }
        // Извлекаем характеристики для расчета суммы и формирования статьи
        logger_1.logger.info("🔢 Извлечение характеристик товара...");
        const characteristics = productInfo.characteristics || [];
        const priceStr = (_b = characteristics.find((c) => c.title === "price")) === null || _b === void 0 ? void 0 : _b.value;
        const quantityStr = (_c = characteristics.find((c) => c.title === "quantity")) === null || _c === void 0 ? void 0 : _c.value;
        const articleName = ((_d = characteristics.find((c) => c.title === "dol_sol")) === null || _d === void 0 ? void 0 : _d.value) ||
            productInfo.title ||
            "Товар";
        logger_1.logger.info("✅ Характеристики товара:", {
            priceStr,
            quantityStr,
            articleName,
        });
        if (!priceStr || !quantityStr) {
            logger_1.logger.error("❌ Ошибка: недостаточно данных в характеристиках");
            res.status(400).json({
                status: "error",
                message: "Недостаточно данных в характеристиках для оплаты сертификатом.",
            });
        }
        const unitPrice = parseFloat(priceStr);
        const quantity = parseInt(quantityStr, 10);
        if (isNaN(unitPrice) || isNaN(quantity)) {
            logger_1.logger.error("❌ Ошибка: ошибка конвертации данных в характеристиках.", { unitPrice, quantity });
            res.status(400).json({
                status: "error",
                message: "Ошибка конвертации данных в характеристиках.",
            });
        }
        const totalValue = (unitPrice * quantity).toFixed(2);
        logger_1.logger.info("💰 Итоговая сумма платежа:", totalValue);
        // Очистка tru_code: убираем пробелы и оставляем только цифры и точку
        const truCodeRaw = ((_e = characteristics.find((c) => c.title === "truCode")) === null || _e === void 0 ? void 0 : _e.value) ||
            "";
        let [beforeDot, afterDot = ""] = truCodeRaw.split(".");
        afterDot = afterDot.padEnd(20, "0").slice(0, 20);
        const truCode = `${beforeDot}.${afterDot}`;
        if (!/^\d+\.\d{20}$/.test(truCode)) {
            logger_1.logger.error("❌ Ошибка: truCode некорректного формата", {
                truCode,
            });
            res.status(400).json({
                status: "error",
                message: `truCode должен быть в формате X.XXXXXXXXXXXXXXXXXXXXXX (после точки ровно 20 символов), но получен: ${truCode}`,
            });
        }
        logger_1.logger.info("🛠 truCode перед отправкой в YooKassa:", { truCode });
        // Извлекаем данные формы клиента
        const { parentName, childName, birthDate, snils, email, phone } = req.body;
        logger_1.logger.info("📜 Данные клиента:", {
            parentName,
            email,
            phone,
            childName,
            birthDate,
            snils,
        });
        // Проверка обязательных полей клиента на непустоту
        if (!parentName ||
            !email ||
            !phone ||
            !childName ||
            !birthDate ||
            !snils) {
            logger_1.logger.error("❌ Ошибка: отсутствуют обязательные поля клиента", {
                parentName,
                email,
                phone,
                childName,
                birthDate,
                snils,
            });
            res.status(400).json({
                status: "error",
                message: "Обязательные поля клиента (parentName, email, phone, childName, birthDate, snils) не могут быть пустыми.",
            });
        }
        let parsedReceipt;
        if (Receipt) {
            try {
                parsedReceipt = JSON.parse(Receipt);
                logger_1.logger.info("🧾 Receipt успешно распаршен:", parsedReceipt);
            }
            catch (e) {
                logger_1.logger.warn("⚠️ Не удалось распарсить Receipt:", e);
            }
        }
        const idempotenceKey = (0, uuid_1.v4)();
        // Формируем массив статей для электронного сертификата
        const articles = [
            {
                article_number: 1,
                tru_code: truCode,
                article_code: productInfo.uid.toString(),
                article_name: articleName,
                quantity: quantity,
                price: {
                    value: unitPrice.toFixed(2),
                    currency: "RUB",
                },
            },
        ];
        logger_1.logger.info("📜 Сформированы articles для платежа:", articles);
        // Формируем данные для платежа через YooKassa
        const paymentData = {
            amount: {
                value: totalValue,
                currency: "RUB",
            },
            payment_method_data: {
                type: "electronic_certificate",
                articles: articles,
            },
            confirmation: {
                type: "redirect",
                return_url: `${config_1.config.BASE_URL}/success?productId=${productId}`,
            },
            capture: true,
            description: `Оплата заказа: ${productInfo.title}`,
            metadata: {
                order_id: productInfo.uid.toString(),
            },
        };
        logger_1.logger.info("📤 Отправка запроса на оплату в YooKassa...");
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
        logger_1.logger.info(`✅ Платёж успешно создан. Ссылка: ${paymentUrl}`);
        // Добавляем платеж в менеджер отложенных платежей для проверки
        PendingPaymentsManager_1.pendingPaymentsManager.addPayment({
            productId,
            productTitle: productInfo.title || "",
            productDescription: productInfo.descr || "",
            paymentId: responseYk.data.id,
            amount: responseYk.data.amount.value,
            currency: responseYk.data.amount.currency,
            status: responseYk.data.status,
            createdAt: new Date(),
            date: {
                parent_name: parentName,
                email,
                phone,
                child_name: childName,
                birth_date: birthDate,
                snils,
            },
        });
        res.json({
            status: "success",
            redirect: paymentUrl,
        });
    }
    catch (error) {
        logger_1.logger.error("❌ Ошибка при создании платежа:", ((_f = error.response) === null || _f === void 0 ? void 0 : _f.data) || error.message);
        res.status(500).json({
            status: "error",
            message: ((_g = error.response) === null || _g === void 0 ? void 0 : _g.data) || error.message,
        });
    }
}));
