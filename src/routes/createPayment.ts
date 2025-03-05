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
        const {
            productId,
            Receipt,
            parentName,
            childName,
            birthDate,
            snils,
            email,
            phone,
        } = req.body;

        logger.info("🚀 Получен запрос на создание платежа", {
            productId,
            parentName,
            childName,
            birthDate,
            snils,
            email,
            phone,
        });

        // Проверка обязательных полей
        if (!productId) {
            logger.error("❌ Ошибка: отсутствует productId");
            res.status(400).json({
                status: "error",
                message: "Не хватает обязательных полей (productId).",
            });
        }

        // Проверка номера телефона
        if (!phone) {
            logger.error("❌ Ошибка: отсутствует номер телефона");
            res.status(400).json({
                status: "error",
                message: "Номер телефона обязателен.",
            });
        }

        // Проверка почты на соответствие формату
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            logger.error("❌ Ошибка: указан некорректный формат почты");
            res.status(400).json({
                status: "error",
                message: "Указан некорректный формат почты.",
            });
        }

        logger.info(
            `🔍 Запрос к Tilda API для получения данных товара ${productId}`
        );

        // Получаем данные товара по id
        const productData = await getOriginalProduct(productId);
        logger.info("📦 Данные товара получены:", productData);

        const productInfo =
            productData && productData.uid
                ? productData
                : productData.products?.[0];

        if (!productInfo) {
            logger.error(`❌ Ошибка: Товар с ID ${productId} не найден`);
            res.status(400).json({
                status: "error",
                message: "Товар не найден!",
            });
        }

        // Проверяем цену товара
        const originalPrice = parseFloat(productInfo.price);
        if (isNaN(originalPrice) || originalPrice <= 0) {
            logger.error(
                `❌ Ошибка: Неверная цена товара (${productInfo.price})`
            );
            res.status(400).json({
                status: "error",
                message: "Неверная цена товара.",
            });
        }

        const title = productInfo.title || "Товар";
        const fullDescription = title;

        logger.info("✅ Характеристики товара:", {
            title,
            description: productInfo.descr || "Нет описания",
            price: originalPrice,
        });

        const amountValue = originalPrice;

        let parsedReceipt: any;
        if (Receipt) {
            try {
                parsedReceipt = JSON.parse(Receipt);
                logger.info("✅ Receipt успешно распарсен");
            } catch (e) {
                logger.warn("⚠️ Ошибка парсинга Receipt", { error: e });
            }
        }

        const idempotenceKey = uuidv4();

        const paymentData: any = {
            amount: {
                value: amountValue,
                currency: "RUB",
            },
            confirmation: {
                type: "redirect",
                return_url: `${config.REDIRECT_URL}`,
            },
            capture: true,
            description: fullDescription,
            metadata: {
                uniqueId: idempotenceKey,
                productId: productId,
            },
        };

        if (parsedReceipt && parsedReceipt.items && parsedReceipt.taxation) {
            const items = parsedReceipt.items.map((item: any) => ({
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

        logger.info("📤 Отправка запроса на оплату в YooKassa...", {
            paymentData,
        });

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
        logger.info(
            `✅ Платёж успешно создан, ссылка на оплату: ${paymentUrl}`
        );

        pendingPaymentsManager.addPayment({
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

        logger.info(
            `✅ Платёж ${responseYk.data.id} добавлен в очередь на проверку`
        );

        res.json({
            status: "success",
            redirect: paymentUrl,
        });
    } catch (error: any) {
        logger.error("❌ Ошибка при создании платежа:", {
            error: error.response?.data || error.message,
        });

        res.status(500).json({
            status: "error",
            message: error.response?.data || error.message,
        });
    }
});

export { router as createPayment };
