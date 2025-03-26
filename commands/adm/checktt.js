const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const chatDataPath = path.join(dataDir, 'chat.json');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Đọc dữ liệu từ file JSON
function readChatData() {
    if (fs.existsSync(chatDataPath)) {
        return JSON.parse(fs.readFileSync(chatDataPath, 'utf8'));
    }
    return {};
}

// Lưu dữ liệu vào file JSON
function saveChatData(chatData) {
    fs.writeFileSync(chatDataPath, JSON.stringify(chatData, null, 2));
}

// Hàm tự động tăng `totalMessages` mỗi phút
setInterval(() => {
    let chatData = readChatData();
    for (const guildId in chatData) {
        for (const userId in chatData[guildId]) {
            chatData[guildId][userId].totalMessages += 10;
        }
    }
    saveChatData(chatData);
    console.log('✅ Đã tăng số tin nhắn cho tất cả người dùng.');
}, 60 * 1000); // 1 phút

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checktt')
        .setDescription('Quản lý hệ thống đếm tin nhắn')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Thêm người dùng vào hệ thống đếm tin nhắn')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng cần thêm')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('check')
                .setDescription('Kiểm tra tổng số tin nhắn của người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng cần kiểm tra')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('all')
                .setDescription('Xem toàn bộ danh sách người dùng đã lưu')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const guildId = interaction.guildId;

        let chatData = readChatData();
        if (!chatData[guildId]) {
            chatData[guildId] = {};
        }

        if (subcommand === 'add') {
            // Thêm người dùng vào hệ thống
            chatData[guildId][user.id] = {
                username: user.username,
                id: user.id,
                totalMessages: 0
            };

            saveChatData(chatData);
            const embed = new EmbedBuilder()
                .setTitle('✅ Người Dùng Đã Được Thêm!')
                .setColor(0x00AE86)
                .addFields(
                    { name: 'Người Dùng', value: user.username, inline: true },
                    { name: 'ID', value: user.id, inline: true },
                    { name: 'Tin Nhắn Ban Đầu', value: '0', inline: true }
                );

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'check') {
            const totalMessages = chatData[guildId][user.id]?.totalMessages || 0;

            const embed = new EmbedBuilder()
                .setTitle('====〚<:rimuru_lewd_hearteyes:1354337942910533685> Thống Kê Hoạt Động〛====')
                .setColor(0x00AE86)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Tên', value: user.username, inline: true },
                    { name: 'ID', value: user.id, inline: true },
                    { name: 'Tổng Tin Nhắn', value: `${totalMessages}`, inline: true }
                );

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'all') {
            const users = Object.values(chatData[guildId] || {});
            if (users.length === 0) {
                return interaction.reply('❌ Không có người dùng nào trong hệ thống.');
            }

            const pageSize = 10;
            let page = 0;
            let totalPages = Math.ceil(users.length / pageSize);

            // Hàm tạo embed cho từng trang
            function generateEmbed(page) {
                const start = page * pageSize;
                const end = start + pageSize;
                const pageUsers = users.slice(start, end);

                const embed = new EmbedBuilder()
                    .setTitle(`📜 Danh Sách Người Dùng (${page + 1}/${totalPages})`)
                    .setColor(0x00AE86)
                    .setFooter({ text: 'Dùng các nút bên dưới để chuyển trang.' });

                pageUsers.forEach((user, index) => {
                    embed.addFields({ name: `${start + index + 1}. ${user.username}`, value: `Tin Nhắn: ${user.totalMessages}`, inline: true });
                });

                return embed;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            );

            const replyMessage = await interaction.reply({ embeds: [generateEmbed(page)], components: [row], fetchReply: true });

            // Bộ thu thập sự kiện cho nút bấm
            const filter = i => i.user.id === interaction.user.id;
            const collector = replyMessage.createMessageComponentCollector({ filter, time: 60 * 1000 });

            collector.on('collect', async i => {
                if (i.customId === 'prev_page' && page > 0) {
                    page--;
                } else if (i.customId === 'next_page' && page < totalPages - 1) {
                    page++;
                }

                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1)
                );

                await i.update({ embeds: [generateEmbed(page)], components: [newRow] });
            });

            collector.on('end', async () => {
                await replyMessage.edit({ components: [] });
            });
        }
    }
};
