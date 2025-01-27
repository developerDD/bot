require('dotenv').config(); // Завантажуємо змінні середовища
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

async function startBot() {
    console.log("🚀 Запуск WhatsApp бота...");
    
    // Отримуємо шлях до Chrome або використовуємо дефолтний
    let executablePath = await chromium.executablePath || '/usr/bin/google-chrome-stable';
    
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            executablePath,
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu"
            ]
        }
    });

    let settings = {
        totalPeople: null,
        drinkers: null,
        bathCost: null,
        expenses: [],
        waitingFor: null
    };

    // Завантажуємо збережені дані, якщо вони є
    if (fs.existsSync("data.json")) {
        settings = JSON.parse(fs.readFileSync("data.json"));
    }

    client.on('qr', qr => {
        qrcode.generate(qr, { small: true });
        console.log("🔹 Скануйте QR-код для авторизації!");
    });

    client.on('ready', () => {
        console.log('✅ Бот готовий до роботи!');
    });

    client.on('message', async msg => {
        let text = msg.body.trim().toLowerCase();
        console.log(`📩 Отримано повідомлення: "${msg.body}"`);

        if (text === "!старт") {
            settings.expenses = [];
            settings.waitingFor = "totalPeople";
            msg.reply("📌 Скільки всього людей було на заході?");
            saveData(settings);
            return;
        }

        if (settings.waitingFor === "totalPeople") {
            let number = parseInt(text);
            if (!isNaN(number) && number > 0) {
                settings.totalPeople = number;
                settings.waitingFor = "drinkers";
                msg.reply("🍾 Скільки людей пили алкоголь?");
                saveData(settings);
            } else {
                msg.reply("❌ Будь ласка, введіть правильну кількість людей.");
            }
            return;
        }

        if (settings.waitingFor === "drinkers") {
            let number = parseInt(text);
            if (!isNaN(number) && number >= 0 && number <= settings.totalPeople) {
                settings.drinkers = number;
                settings.waitingFor = "bathCost";
                msg.reply("🛁 Скільки коштувала баня?");
                saveData(settings);
            } else {
                msg.reply("❌ Введіть правильну кількість тих, хто пив.");
            }
            return;
        }

        if (settings.waitingFor === "bathCost") {
            let number = parseInt(text);
            if (!isNaN(number) && number >= 0) {
                settings.bathCost = number;
                settings.waitingFor = "expenses";
                msg.reply("💰 Введіть витрати у форматі: `Ім'я 1000 їжа`, `Ім'я 500 алкоголь`, `Ім'я 2000 баня`. Коли закінчите, напишіть `готово`.");
                saveData(settings);
            } else {
                msg.reply("❌ Введіть правильну суму за баню.");
            }
            return;
        }
    });

    client.initialize();
}

// Функція збереження даних
function saveData(settings) {
    fs.writeFileSync("data.json", JSON.stringify(settings, null, 2));
}

// Запускаємо бота
startBot().catch(err => console.error("❌ Помилка запуску бота:", err));
