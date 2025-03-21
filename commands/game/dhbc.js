const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dhbc')
        .setDescription('Chơi trò Đuổi Hình Bắt Chữ!'),

    async execute(interaction) {
        await interaction.deferReply(); // Đợi API phản hồi
        
        try {
            const response = await axios.get('https://subhatde.id.vn/game/dhbcv2');
            const data = response.data;
            const { tukhoa, sokitu, suggestions, link1, link2 } = data.doanhinh;
            
            // Gửi hình ảnh và văn bản yêu cầu trả lời
            const message = await interaction.editReply({
                content: `🦏 **ĐUỔI HÌNH BẮT CHỮ** 🌴\n🔠 Gợi ý: **${suggestions}**\n❓ Số ký tự: **${sokitu}**\n💬 Trả lời bằng cách reply tin nhắn này!`,
                files: [link1, link2]
            });
            
            // Tạo bộ thu thập phản hồi
            const filter = m => m.reference && m.reference.messageId === message.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
            
            collector.on('collect', async m => {
                if (m.content.toLowerCase() === tukhoa.toLowerCase()) {
                    await m.reply('✅ Chính xác! Câu hỏi mới sẽ đến sau 5 giây...');
                    
                    setTimeout(async () => {
                        // Kiểm tra nếu bot có quyền xóa tin nhắn
                        if (interaction.guild && interaction.channel.permissionsFor(interaction.client.user).has(PermissionFlagsBits.ManageMessages)) {
                            try {
                                await message.delete(); // Xóa tin nhắn cũ
                                await m.delete(); // Xóa tin nhắn của người chơi
                            } catch (err) {
                                console.warn('Không thể xóa tin nhắn:', err);
                            }
                        }

                        // Tiếp tục câu hỏi mới mà không gặp lỗi 2FA
                        module.exports.execute(interaction);
                    }, 5000);

                    collector.stop(); // Dừng bộ thu thập
                } else {
                    await m.reply('❌ Bé iu sai òii!');
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp('⏳ Hết thời gian! Câu hỏi kết thúc.');
                }
            });
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Lỗi khi lấy dữ liệu từ API, vui lòng thử lại sau!');
        }
    }
};
