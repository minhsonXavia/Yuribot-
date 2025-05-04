const { Events } = require('discord.js');
const moment = require('moment-timezone');

const ADMIN_ID = '1306552024568959016'; //nhớ thay id ở đây, nếu hiện thiếu pack thì npm i (tên pack nó hiện
const COOLDOWN_TIME = 30; 
let isConsoleDisabled = false;
let num = 0;
let maxLogs = 20;
let timeStamp = 0;

async function loadChalk() {
    return (await import('chalk')).default;
}

function disableConsole(cooldowns) {
    console.log("⚠️ Kích hoạt chế độ chống lag console trong " + cooldowns + " giây");
    isConsoleDisabled = true;
    setTimeout(() => {
        isConsoleDisabled = false;
        console.log("✅ Tắt chế độ chống lag console");
    }, cooldowns * 1000);
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        try {
            const chalk = await loadChalk();
            const dateNow = Date.now();
            if (isConsoleDisabled) return;

            const username = message.author.username || "Unknown";
            const userId = message.author.id;
            const channelName = message.channel.name || "Tin nhắn riêng";
            const channelId = message.channel.id;
            const content = message.content || "Ảnh, video hoặc ký tự đặc biệt";
            const time = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

            num++;

            console.log(chalk.hex("#FF66FF")("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
            console.log(chalk.hex("#CC66FF")(`┣➤ Kênh: ${channelName}`));
            console.log(chalk.hex("#9966FF")(`┣➤ ID Kênh: ${channelId}`));
            console.log(chalk.hex("#6666FF")(`┣➤ Người gửi: ${username}`));
            console.log(chalk.hex("#3366FF")(`┣➤ ID Người gửi: ${userId}`));
            console.log(chalk.hex("#0066FF")(`┣➤ Nội dung: ${content}`));
            console.log(chalk.hex("#0033FF")(`┣➤ Thời gian: ${time}`));
            console.log(chalk.hex("#0000FF")("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));

            timeStamp = dateNow;
            if (Date.now() - timeStamp > 1000) {
                if (num <= maxLogs) num = 0;
            }
            if (Date.now() - timeStamp < 1000) {
                if (num >= maxLogs) {
                    num = 0;
                    disableConsole(COOLDOWN_TIME);
                }
            }

        } catch (e) {
            console.log("❌ Lỗi xử lý console event:", e);
        }
    }
};
