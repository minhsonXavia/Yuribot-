const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const moneyFile = path.join(__dirname, '../data/money.json');
const MAX_REWARD = 100; // Giới hạn thưởng tối đa là 100 YuriCoin
const activeGames = new Map();

// Đọc dữ liệu tiền từ file
const loadMoneyData = () => {
    if (!fs.existsSync(moneyFile)) {
        fs.writeFileSync(moneyFile, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(moneyFile, 'utf8'));
};

// Ghi dữ liệu tiền vào file
const saveMoneyData = (data) => {
    fs.writeFileSync(moneyFile, JSON.stringify(data, null, 2));
};

// Quản lý tiền tệ
const currencyManager = {
    increaseMoney: async (userId, amount) => {
        const moneyData = loadMoneyData();
        moneyData[userId] = (moneyData[userId] || 0) + amount;
        saveMoneyData(moneyData);
    },
    decreaseMoney: async (userId, amount) => {
        const moneyData = loadMoneyData();
        moneyData[userId] = Math.max((moneyData[userId] || 0) - amount, 0); // Không để số âm
        saveMoneyData(moneyData);
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dovui')
        .setDescription('Game đố vui - Trò chơi đố vui với phần thưởng'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            await runRiddle(interaction);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Có lỗi xảy ra khi tải câu đố. Vui lòng thử lại sau!' });
        }
    }
};

async function runRiddle(interaction) {
    try {
        const response = await axios.get('https://subhatde.id.vn/game/dovui');
        const { question, option, correct } = response.data.data;

        const embed = new EmbedBuilder()
            .setTitle('『Đ𝑶̂́ 𝑽𝑼𝑰』')
            .setDescription(`**Câu Đố:** ${question}`)
            .setColor('#FFD700')
            .setFooter({ text: 'Hãy chọn một trong các đáp án dưới đây!' });

        option.forEach((opt, index) => {
            embed.addFields({ name: `${index + 1}. ${opt}`, value: '\u200B', inline: false });
        });

        const buttons = option.map((_, index) =>
            new ButtonBuilder()
                .setCustomId(`answer_${index}`)
                .setLabel(`${index + 1}`)
                .setStyle(ButtonStyle.Primary)
        );

        const nextButton = new ButtonBuilder()
            .setCustomId('next_question')
            .setLabel('➡️ Câu kế')
            .setStyle(ButtonStyle.Success);
        
        const toggleAutoButton = new ButtonBuilder()
            .setCustomId('toggle_auto')
            .setLabel('🔄 Auto')
            .setStyle(ButtonStyle.Secondary);

        const answerRow = new ActionRowBuilder().addComponents(buttons);
        const controlRow = new ActionRowBuilder().addComponents(nextButton, toggleAutoButton);

        const reply = await interaction.editReply({
            embeds: [embed],
            components: [answerRow, controlRow]
        });

        activeGames.set(reply.id, {
            userId: interaction.user.id,
            question,
            option,
            correct,
            autoNext: false,
            messageId: reply.id
        });

        const collector = reply.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            const gameData = activeGames.get(reply.id);
            if (!gameData || i.user.id !== gameData.userId) {
                await i.reply({ content: 'Đây không phải trò chơi của bạn!', ephemeral: true });
                return;
            }

            await i.deferUpdate(); // Tránh lỗi InteractionNotReplied

            if (i.customId === 'next_question') {
                await handleNextQuestion(i);
                return;
            }

            if (i.customId === 'toggle_auto') {
                await handleToggleAuto(i, reply.id);
                return;
            }

            if (i.customId.startsWith('answer_')) {
                const answerIndex = parseInt(i.customId.split('_')[1]);
                await handleAnswer(i, answerIndex, gameData);
                return;
            }
        });

        collector.on('end', () => {
            activeGames.delete(reply.id);
        });
    } catch (error) {
        console.error('Error in runRiddle:', error);
        await interaction.editReply({ content: '❌ Có lỗi xảy ra. Vui lòng thử lại sau!' });
    }
}

async function handleAnswer(interaction, answerIndex, gameData) {
    try {
        const selectedOption = gameData.option[answerIndex];
        const isCorrect = selectedOption === gameData.correct;
        const rewardAmount = isCorrect ? MAX_REWARD : 0; // Giới hạn thưởng

        if (isCorrect) {
            await currencyManager.increaseMoney(interaction.user.id, rewardAmount);
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle(isCorrect ? '✅ Chính xác!' : '❌ Sai rồi!')
            .setDescription(`**Đáp án đúng:** ${gameData.correct}`)
            .setColor(isCorrect ? '#00FF00' : '#FF0000')
            .addFields({
                name: 'Kết quả',
                value: isCorrect 
                    ? `Bạn nhận được **${rewardAmount} YuriCoin**`
                    : `Rất tiếc, bạn đã trả lời sai.`,
                inline: false
            });

        await interaction.editReply({
            embeds: [resultEmbed],
            components: []
        });

        if (gameData.autoNext) {
            setTimeout(async () => {
                await runRiddle(interaction);
            }, 3000);
        }
    } catch (error) {
        console.error('Error in handleAnswer:', error);
    }
}

async function handleNextQuestion(interaction) {
    try {
        activeGames.delete(interaction.message.id);
        await runRiddle(interaction);
    } catch (error) {
        console.error('Error in handleNextQuestion:', error);
    }
}

async function handleToggleAuto(interaction, messageId) {
    try {
        const gameData = activeGames.get(messageId);
        if (!gameData) return;

        gameData.autoNext = !gameData.autoNext;
        activeGames.set(messageId, gameData);

        await interaction.followUp({ 
            content: `🔄 Tự động chuyển câu hỏi đã được ${gameData.autoNext ? 'bật' : 'tắt'}`,
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error in handleToggleAuto:', error);
    }
}
