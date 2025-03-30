const { Events, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Skip if message is from a bot or not in a guild
    if (message.author.bot || !message.guild) return;
    
    // Auto responses section - handle these first
    const responses = {
      "hi": "chào aiu 🥰",
      "tớ buồn quá": "vui lên nè ;3",
      "bot ngu quá": "🥺 huhu đừng nói vậy mà...",
      "hôm nay trời đẹp quá": "Ừa, trời đẹp như cậu vậy đó 😘",
      "ăn cơm chưa": "Chưa nè, cậu bao tớ ăn không? 🤭",
      "địt nhau khong": "dăm quá à😡",
      "alo": "gọi gì đang bạn à nha",
      "bot": "im coiii tao đang hoc",
      "admins đâu": "Bố con bận ngắm gái https://www.facebook.com/lms.cutii",
      "yêu bot": "cút🤕bao giờ LMS có ny thì yuri mới iu"
    };

    // Check for auto responses first
    const userMessage = message.content.toLowerCase();
    if (responses[userMessage]) {
      await message.reply(responses[userMessage]);
      return; // Exit to avoid further processing
    }
    
    // Try to get guild settings if db exists, otherwise use default settings
    let fixspamEnabled = true; // Default to enabled
    let logChannelId = '1355563354730791074'; // Default log channel
    
    try {
      // Only try to access database if client.db exists
      if (client && client.db && typeof client.db.get === 'function') {
        const guildId = message.guild.id;
        const guildSettings = await client.db.get(`guilds.${guildId}`) || {};
        
        // Get settings from database if available
        if (guildSettings.hasOwnProperty('fixspam')) {
          fixspamEnabled = guildSettings.fixspam;
        }
        
        if (guildSettings.logChannelId) {
          logChannelId = guildSettings.logChannelId;
        }
      }
    } catch (error) {
      console.error("Error accessing database:", error);
      // Continue with default settings
    }
    
    // Skip if anti-insult moderation is disabled
    if (fixspamEnabled === false) return;
    
    // List of phrases that are considered insults to the bot
    const bannedPhrases = [
      "bot óc chó", "bot lồn", "bot ngu", "bot gà", "bot lol", 
      "bot tuấn óc", "bot như cặc", "bot chó", "bot ngu lồn", 
      "dm bot", "dmm bot", "Clm bot", "bot ghẻ", "đmm bot", 
      "đb bot", "bot điên", "bot dở", "bot khùng", "đĩ bot", 
      "bot paylac rồi", "con bot lòn", "cmm bot", "clap bot", 
      "bot ncc", "bot oc", "bot óc", "bot óc chó", "cc bot", 
      "bot tiki", "lozz bottt", "lol bot", "loz bot", "lồn bot", 
      "bot hãm", "bot lon", "bot cac", "bot nhu lon", "bot như cc", 
      "bot như bìu", "bot sida", "bot xàm", "bot fake", "bot súc vật", 
      "bot shoppee", "bot đểu", "bot như lồn", "bot dởm", "bot lỏ", 
      "bot cak", "Bot l", "đỉ bot"
    ];
    
    const content = message.content.toLowerCase();
    
    // Check if message matches any banned phrase (exact match or case variations)
    const bannedPhrase = bannedPhrases.find(phrase => {
      const lowercasePhrase = phrase.toLowerCase();
      return content === lowercasePhrase || 
             content === phrase || 
             content === phrase.toUpperCase() ||
             content === phrase[0].toUpperCase() + phrase.slice(1) ||
             content.includes(lowercasePhrase);  // Also check if content includes the banned phrase
    });
    
    if (bannedPhrase) {
      try {
        // Get the member
        const member = message.member;
        if (!member) return;
        
        const time = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
        
        // Check if bot has permission to timeout members
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return message.channel.send("Bot không có quyền timeout thành viên!");
        }
        
        // Check if the member can be timed out (not an admin, etc.)
        if (!member.moderatable) {
          return message.channel.send(`Không thể timeout ${member.user.username} vì họ có quyền cao hơn bot!`);
        }
        
        // Timeout the user for 1 minute (60000 ms)
        await member.timeout(60000, `Insulted bot: "${bannedPhrase}"`);
        console.log(`User ${member.user.tag} timed out for saying "${bannedPhrase}"`);
        
        // Get the log channel
        const logChannel = message.guild.channels.cache.get(logChannelId);
        
        // Create a rich embed for the notification
        const banEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('» Thông báo từ Admin «')
          .setDescription(`◆━━━━━━━━━━━━━━━━━━◆`)
          .addFields(
            { name: '👤 Người Dùng', value: `${message.author.username} (<@${message.author.id}>)`, inline: true },
            { name: '💬 Nội Dung', value: `\`${message.content}\``, inline: true },
            { name: '🚫 Vi Phạm', value: `\`${bannedPhrase}\``, inline: true },
            { name: '⏱️ Thời Gian', value: time, inline: true },
            { name: '📌 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '⚠️ Hình Phạt', value: 'Timeout 1 phút', inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Bot Auto Moderation System' });
        
        // Send notification to the log channel if it exists
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({ embeds: [banEmbed] });
        } else {
          console.log(`Log channel with ID ${logChannelId} not found or is not a text channel`);
        }
        
        // Notify in the original channel
        await message.channel.send({
          content: `» Thông báo từ Admin «\n◆━━━━━━━━━━━━━━━━━━◆\n${message.author.username}, Bạn thật ngu lồn khi chửi bot vì vậy bot vừa auto ban bạn khỏi hệ thống trong 1 phút\n\n💌 Liên hệ Admin để được gỡ ban sớm hơn\nĐừng chửi bot nữa nhé >< \n\n⚠️ Thả tym cho bạn nè <3`
        });
        
      } catch (error) {
        console.error("Error in insult moderation:", error);
        message.channel.send(`Lỗi khi xử lý người dùng: ${error.message}`);
      }
    }
  }
};
