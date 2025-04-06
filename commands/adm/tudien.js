const { SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


module.exports = {
    data: new SlashCommandBuilder()
        .setName('dict')
        .setDescription('Tra cứu từ điển tiếng Anh')
        .addStringOption(option => 
            option.setName('word')
                .setDescription('Từ cần tra nghĩa')
                .setRequired(true)),

    async execute(interaction) {
        const word = interaction.options.getString('word');

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const data = await res.json();

            if (data.title === 'No Definitions Found') {
                return interaction.reply(`❌ Không tìm thấy định nghĩa cho từ **${word}**.`);
            }

            const entry = data[0];
            const phonetics = entry.phonetics.find(p => p.audio) || {};
            const firstMeaning = entry.meanings[0];
            const firstDefinition = firstMeaning.definitions[0];

            let replyMsg = `📘 **${entry.word}** (${firstMeaning.partOfSpeech})\n`;
            if (phonetics.text) replyMsg += `🔉 Phát âm: *${phonetics.text}*\n`;
            if (firstDefinition.definition) replyMsg += `💬 Nghĩa: ${firstDefinition.definition}\n`;
            if (firstDefinition.example) replyMsg += `📌 Ví dụ: _${firstDefinition.example}_\n`;
            if (entry.sourceUrls && entry.sourceUrls[0]) replyMsg += `🔗 [Nguồn](${entry.sourceUrls[0]})`;

            return interaction.reply({ content: replyMsg, files: phonetics.audio ? [phonetics.audio] : [] });
        } catch (error) {
            console.error(error);
            return interaction.reply('⚠️ Đã xảy ra lỗi khi tra cứu từ điển.');
        }
    }
};
