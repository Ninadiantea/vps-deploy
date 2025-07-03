require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { deployToVPS } = require('./deploy');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const userSessions = {};

function getStep(chatId) {
    return userSessions[chatId]?.step || 0;
}
function setStep(chatId, step) {
    userSessions[chatId] = userSessions[chatId] || {};
    userSessions[chatId].step = step;
}
function setSession(chatId, key, value) {
    userSessions[chatId] = userSessions[chatId] || {};
    userSessions[chatId][key] = value;
}

bot.onText(/\/start/, (msg) => {
    setStep(msg.chat.id, 1);
    bot.sendMessage(msg.chat.id, "🤖 Selamat datang di *Auto Deploy Bot*!\n\n💻 Masukkan *IP VPS* kamu:", { parse_mode: "Markdown" });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text.startsWith('/start')) return;

    const step = getStep(chatId);

    if (step === 1) {
        setSession(chatId, 'ip', msg.text.trim());
        setStep(chatId, 2);
        return bot.sendMessage(chatId, "🔑 Masukkan *username VPS* kamu (contoh: root):", { parse_mode: "Markdown" });
    }

    if (step === 2) {
        setSession(chatId, 'username', msg.text.trim());
        setStep(chatId, 3);
        return bot.sendMessage(chatId, "🔒 Masukkan *password VPS* kamu:", { parse_mode: "Markdown" });
    }

    if (step === 3) {
        setSession(chatId, 'password', msg.text.trim());
        setStep(chatId, 4);
        return bot.sendMessage(chatId, "📦 Kirimkan *link repo GitHub* yang ingin kamu deploy:", { parse_mode: "Markdown" });
    }

    if (step === 4) {
        setSession(chatId, 'repo', msg.text.trim());
        setStep(chatId, 5);
        bot.sendMessage(chatId, "⏳ Sedang proses deploy... Mohon tunggu beberapa menit 🚀");

        const { ip, username, password, repo } = userSessions[chatId];
        try {
            const hasil = await deployToVPS({ ip, username, password, repo });
            bot.sendMessage(chatId, hasil.message, { parse_mode: "Markdown" });
            if (hasil.configInfo) {
                bot.sendMessage(chatId, hasil.configInfo, { parse_mode: "Markdown" });
            }
        } catch (err) {
            bot.sendMessage(chatId, `❌ Deploy gagal. Pesan error:\n\`\`\`\n${err.message}\n\`\`\``, { parse_mode: "Markdown" });
        }
        setStep(chatId, 0);
    }
});
