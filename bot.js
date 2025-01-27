require('dotenv').config(); // Додаємо підтримку .env
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client({
    puppeteer: {
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
    },
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log("🔹 QR-код для авторизації відображено");
});

client.on('ready', () => {
    console.log('✅ Бот готовий до роботи!');
});

client.on('message', async msg => {
    let text = msg.body.trim().toLowerCase();
    console.log(`📩 Отримано повідомлення: "${msg.body}" (обробка: "${text}")`);

    if (text === "!старт") {
        settings.expenses = [];
        settings.waitingFor = "totalPeople";
        msg.reply("📌 Скільки всього людей було на заході?");
        return;
    }

    if (settings.waitingFor === "totalPeople") {
        let number = parseInt(text);
        if (!isNaN(number) && number > 0) {
            settings.totalPeople = number;
            settings.waitingFor = "drinkers";
            msg.reply("🍾 Скільки людей пили алкоголь?");
        } else {
            msg.reply("❌ Введіть правильну кількість людей.");
        }
        return;
    }

    if (settings.waitingFor === "drinkers") {
        let number = parseInt(text);
        if (!isNaN(number) && number >= 0 && number <= settings.totalPeople) {
            settings.drinkers = number;
            settings.waitingFor = "bathCost";
            msg.reply("🛁 Введіть загальну вартість бані (або 0, якщо її не було).");
        } else {
            msg.reply("❌ Введіть коректну кількість тих, хто пив.");
        }
        return;
    }

    if (settings.waitingFor === "bathCost") {
        let number = parseInt(text);
        if (!isNaN(number) && number >= 0) {
            settings.bathCost = number;
            settings.waitingFor = "expenses";
            msg.reply("💰 Введіть витрати у форматі:\n\n`Ім'я 1000 їжа`\n`Ім'я 500 алкоголь`\n`Ім'я 2000 баня`\n\nКоли закінчите, напишіть `готово`.");
        } else {
            msg.reply("❌ Введіть коректну вартість бані.");
        }
        return;
    }

    if (settings.waitingFor === "expenses") {
        if (text === "готово") {
            settings.waitingFor = null;
            msg.reply(calculatePayments());
            return;
        }

        let parts = text.split(" ");
        if (parts.length < 3) {
            msg.reply("❌ Неправильний формат. Використовуйте: `Ім'я 1000 їжа`, `Ім'я 500 алкоголь`, `Ім'я 2000 баня`.");
            return;
        }

        let name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        let amount = parseInt(parts[1]);
        let category = parts[2].toLowerCase();

        if (isNaN(amount) || !["їжа", "алкоголь", "баня"].includes(category)) {
            msg.reply("❌ Введіть коректну суму і категорію (їжа, алкоголь, баня).");
            return;
        }

        settings.expenses.push({ name, amount, category });
        msg.reply(`✅ Додано: ${name} витратив ${amount} грн на ${category}.`);
        return;
    }

    msg.reply("❌ Я не розумію цю команду. Почніть з `!старт`.");
});

function calculatePayments() {
    let totalSpent = { "їжа": 0, "алкоголь": 0, "баня": settings.bathCost };
    let contributions = {};

    settings.expenses.forEach(exp => {
        totalSpent[exp.category] += exp.amount;
        if (!contributions[exp.name]) {
            contributions[exp.name] = { "їжа": 0, "алкоголь": 0, "баня": 0 };
        }
        contributions[exp.name][exp.category] += exp.amount;
    });

    let perPersonFood = totalSpent["їжа"] / settings.totalPeople;
    let perPersonBath = totalSpent["баня"] / settings.totalPeople;
    let perDrinkerAlcohol = settings.drinkers > 0 ? totalSpent["алкоголь"] / settings.drinkers : 0;

    let balances = {};
    Object.keys(contributions).forEach(name => {
        let spent = (contributions[name]["їжа"] || 0) + (contributions[name]["алкоголь"] || 0) + (contributions[name]["баня"] || 0);
        let shouldPay = perPersonFood + perPersonBath + (contributions[name]["алкоголь"] > 0 ? perDrinkerAlcohol : 0);
        balances[name] = spent - shouldPay;
    });

    let result = `📊 *Розподіл витрат:*\n`;
    result += `Загальна сума: ${totalSpent["їжа"] + totalSpent["алкоголь"] + totalSpent["баня"]} грн\n`;
    result += `Кожен платить за їжу: ${perPersonFood.toFixed(2)} грн\n`;
    result += `Кожен платить за баню: ${perPersonBath.toFixed(2)} грн\n`;
    result += settings.drinkers > 0 ? `Кожен, хто пив, платить за алкоголь: ${perDrinkerAlcohol.toFixed(2)} грн\n\n` : "\n";

    Object.keys(balances).forEach(name => {
        if (balances[name] > 0) {
            result += `✅ ${name} переплатив: ${balances[name].toFixed(2)} грн (йому повертають)\n`;
        } else {
            result += `❌ ${name} винен: ${(-balances[name]).toFixed(2)} грн\n`;
        }
    });

    return result;
}
