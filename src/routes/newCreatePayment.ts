import express, { Request, Response } from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { pendingPaymentsManager } from "../utils/PendingPaymentsManager";
import { config } from "../config";
import { getOriginalProduct } from "../utils/getOriginalProduct";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
    try {
        logger.info("🚀 Получен запрос на создание платежа", req.body);

        const { productId, Receipt } = req.body;
        if (!productId) {
            logger.error("❌ Ошибка: отсутствует productId в запросе");
            res.status(400).json({
                status: "error",
                message: "Не хватает обязательных полей (productId).",
            });
        }

        // Получаем данные товара по ID
        logger.info(
            `🔍 Запрос к Tilda API для получения данных товара ${productId}`
        );
        const productData = await getOriginalProduct(productId);

        logger.info("📦 Данные товара получены:", productData);

        const productInfo = productData?.uid
            ? productData
            : productData.products?.[0];
        if (!productInfo) {
            logger.error("❌ Ошибка: товар не найден!", productData);
            res.status(400).json({
                status: "error",
                message: "Товар не найден!",
            });
        }

        // Извлекаем характеристики для расчета суммы и формирования статьи
        logger.info("🔢 Извлечение характеристик товара...");
        const characteristics = productInfo.characteristics || [];
        const priceStr = characteristics.find(
            (c: any) => c.title === "price"
        )?.value;
        const quantityStr = characteristics.find(
            (c: any) => c.title === "quantity"
        )?.value;

        const articleName =
            characteristics.find((c: any) => c.title === "dol_sol")?.value ||
            productInfo.title ||
            "Товар";

        logger.info("✅ Характеристики товара:", {
            priceStr,
            quantityStr,
            articleName,
        });

        if (!priceStr || !quantityStr) {
            logger.error("❌ Ошибка: недостаточно данных в характеристиках");
            res.status(400).json({
                status: "error",
                message:
                    "Недостаточно данных в характеристиках для оплаты сертификатом.",
            });
        }

        const unitPrice = parseFloat(priceStr);
        const quantity = parseInt(quantityStr, 10);
        if (isNaN(unitPrice) || isNaN(quantity)) {
            logger.error(
                "❌ Ошибка: ошибка конвертации данных в характеристиках.",
                { unitPrice, quantity }
            );
            res.status(400).json({
                status: "error",
                message: "Ошибка конвертации данных в характеристиках.",
            });
        }
        const totalValue = (unitPrice * quantity).toFixed(2);
        logger.info("💰 Итоговая сумма платежа:", totalValue);

        // Очистка tru_code: убираем пробелы и оставляем только цифры и точку
        const truCodeRaw =
            characteristics.find((c: any) => c.title === "truCode")?.value ||
            "";
        let [beforeDot, afterDot = ""] = truCodeRaw.split(".");
        afterDot = afterDot.padEnd(20, "0").slice(0, 20);
        const truCode = `${beforeDot}.${afterDot}`;

        if (!/^\d+\.\d{20}$/.test(truCode)) {
            logger.error("❌ Ошибка: truCode некорректного формата", {
                truCode,
            });
            res.status(400).json({
                status: "error",
                message: `truCode должен быть в формате X.XXXXXXXXXXXXXXXXXXXXXX (после точки ровно 20 символов), но получен: ${truCode}`,
            });
        }

        logger.info("🛠 truCode перед отправкой в YooKassa:", { truCode });

        // Извлекаем данные формы клиента
        const { parentName, childName, birthDate, snils, email, phone } =
            req.body;
        logger.info("📜 Данные клиента:", {
            parentName,
            email,
            phone,
            childName,
            birthDate,
            snils,
        });

        // Проверка обязательных полей клиента на непустоту
        if (
            !parentName ||
            !email ||
            !phone ||
            !childName ||
            !birthDate ||
            !snils
        ) {
            logger.error("❌ Ошибка: отсутствуют обязательные поля клиента", {
                parentName,
                email,
                phone,
                childName,
                birthDate,
                snils,
            });
            res.status(400).json({
                status: "error",
                message:
                    "Обязательные поля клиента (parentName, email, phone, childName, birthDate, snils) не могут быть пустыми.",
            });
        }

        let parsedReceipt: any;
        if (Receipt) {
            try {
                parsedReceipt = JSON.parse(Receipt);
                logger.info("🧾 Receipt успешно распаршен:", parsedReceipt);
            } catch (e) {
                logger.warn("⚠️ Не удалось распарсить Receipt:", e);
            }
        }

        const idempotenceKey = uuidv4();

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

        logger.info("📜 Сформированы articles для платежа:", articles);

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
                return_url: `${config.BASE_URL}/success?productId=${productId}`,
            },
            capture: true,
            description: `Оплата заказа: ${productInfo.title}`,
            metadata: {
                order_id: productInfo.uid.toString(),
            },
        };

        logger.info("📤 Отправка запроса на оплату в YooKassa...");
        const responseYk = await axios.post(
            config.YOOKASSA_API_URL,
            paymentData,
            {
                auth: {
                    username: config.SHOP_ID,
                    password: config.API_KEY,
                },
                headers: {
                    "Content-Type": "application/json",
                    "Idempotence-Key": idempotenceKey,
                },
            }
        );

        const paymentUrl = responseYk.data.confirmation.confirmation_url;
        logger.info(`✅ Платёж успешно создан. Ссылка: ${paymentUrl}`);

        // Добавляем платеж в менеджер отложенных платежей для проверки
        pendingPaymentsManager.addPayment({
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
    } catch (error: any) {
        logger.error(
            "❌ Ошибка при создании платежа:",
            error.response?.data || error.message
        );
        res.status(500).json({
            status: "error",
            message: error.response?.data || error.message,
        });
    }
});

export { router as createPayment };
