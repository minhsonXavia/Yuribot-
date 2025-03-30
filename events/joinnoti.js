const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      // Channel ID to send notifications
      const channelId = '1355760242176167936';
      const channel = member.guild.channels.cache.get(channelId);
      
      if (!channel) {
        console.error(`Channel with ID ${channelId} not found.`);
        return;
      }
      
      // Get the total member count
      const memberCount = member.guild.memberCount;
      
      // Create welcome embed
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#FF9DD1')
        .setTitle('🌸𝐘𝐔𝐑𝐈 𝐂𝐇𝐀̀𝐎 𝐌𝐔̛̀𝐍𝐆 𝐁𝐄́ 𝐓𝐎̛́𝐈 𝐕𝐎̛́𝐈 𝐒𝐄𝐕𝐄𝐑🌸')
        .setDescription(`-𝐁𝐄́ 𝐈𝐔 𝐋𝐀̀ 𝐓𝐇𝐀̀𝐍𝐇 𝐕𝐈𝐄̂𝐍🫂: ${memberCount}\n-𝗧𝗲̂𝗻 𝗕𝗲́ 𝗶𝘂 𝗺𝗼̛́𝗶 𝘃𝗮̀𝗼🏞️: ${member}\n-𝐁𝐄́ 𝐈𝐔 𝐒𝐄̃ 𝐊𝐇𝐎̂𝐍𝐆 Đ𝐔̛𝐎̛̣𝐂 𝐂𝐇𝐔̛̉𝐈 𝐁𝐀̣̂𝐘 𝐇𝐎𝐀̣̆𝐂 𝐆𝐔̛̉𝐈 𝐀̉𝐍𝐇🔞 𝐍𝐄̂́𝐔 𝐊𝐇𝐎̂𝐍𝐆 𝐌𝐔𝐎̂́𝐍 𝐁𝐈̣ 𝐓𝐈𝐌𝐄𝐎𝐔𝐓\n-𝐇𝐀̃𝐘 𝐕𝐀̀𝐎 𝐊𝐄̂𝐍𝐇 𝐂𝐇𝐀𝐓 𝐕𝐀̀ 𝐓𝐄𝐒𝐓 𝐁𝐎𝐓 𝐓𝐇𝐎𝐈 𝐍𝐀̀𝐎📁\n========================================`)
        .setImage('https://media.giphy.com/media/b1qGICT4kHVOo8OX9o/giphy.gif?cid=ecf05e47tgm1ashy9ojg93ymok5ssmxcr0qcqnccx697hmjt&ep=v1_gifs_search&rid=giphy.gif&ct=g')
        .setTimestamp()
        .setFooter({ text: `${member.guild.name} • Chào mừng!`, iconURL: member.guild.iconURL({ dynamic: true }) });
      
      // Send the welcome message
      await channel.send({ embeds: [welcomeEmbed] });
      console.log(`Sent welcome message for new member: ${member.user.tag}`);
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  }
};
