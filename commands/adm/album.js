const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('album')
    .setDescription('Display buttons to choose different image categories'),

  async execute(interaction) {
    // Create buttons for different image categories
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ayaka')
          .setLabel('Ayaka')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('girl')
          .setLabel('Ảnh nữ')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('gura')
          .setLabel('Gura')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('cosplay')
          .setLabel('Cosplay')
          .setStyle(ButtonStyle.Primary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('nude')
          .setLabel('nude')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('bluearchive')
          .setLabel('Blue Archive')
          .setStyle(ButtonStyle.Primary)
      );

    // Send initial message with buttons
    const embed = new EmbedBuilder()
      .setTitle('🖼️ Album Ảnh')
      .setDescription('Chọn một nút để xem ảnh ngẫu nhiên từ danh mục đó')
      .setColor(0x0099FF);

    const message = await interaction.reply({
      embeds: [embed],
      components: [row, row2],
      fetchReply: true
    });

    // Create collector for button interactions
    const collector = message.createMessageComponentCollector({
      time: 60000 // Collector will be active for 60 seconds
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'Bạn không thể sử dụng nút này!', ephemeral: true });
      }

      await i.deferUpdate();
      
      let imageUrl;
      let embedTitle;

      try {
        switch (i.customId) {
          case 'ayaka':
            embedTitle = 'Ayaka';
            imageUrl = await getLocalImage('../data/ayaka.json');
            break;
          case 'girl':
            embedTitle = 'Ảnh nữ';
            imageUrl = await getLocalImage('../data/girl.json');
            break;
          case 'gura':
            embedTitle = 'Gura';
            const guraData = await fetchApi('https://subhatde.id.vn/images/gura');
            imageUrl = guraData.url;
            break;
          case 'cosplay':
            embedTitle = 'Cosplay';
            imageUrl = await getLocalImage('../data/cosplay.json');
            break;
          case 'nude':
            embedTitle = 'nude';
            imageUrl = await getLocalImage('../data/nude.json');
            break;
          case 'bluearchive':
            embedTitle = 'Blue Archive';
            const baData = await fetchApi('https://haji-mix.up.railway.app/api/ba');
            imageUrl = baData.url;
            break;
        }

        const responseEmbed = new EmbedBuilder()
          .setTitle(`🖼️ ${embedTitle}`)
          .setImage(imageUrl)
          .setColor(0x0099FF)
          .setFooter({ text: 'Nhấn nút để xem ảnh khác' });

        await i.editReply({
          embeds: [responseEmbed],
          components: [row, row2]
        });
      } catch (error) {
        console.error('Error fetching image:', error);
        await i.editReply({
          content: 'Có lỗi xảy ra khi lấy ảnh. Vui lòng thử lại sau.',
          embeds: [],
          components: [row, row2]
        });
      }
    });

    collector.on('end', () => {
      // Disable all buttons when collector expires
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          row.components[0].setDisabled(true),
          row.components[1].setDisabled(true),
          row.components[2].setDisabled(true),
          row.components[3].setDisabled(true)
        );

      const disabledRow2 = new ActionRowBuilder()
        .addComponents(
          row2.components[0].setDisabled(true),
          row2.components[1].setDisabled(true)
        );

      interaction.editReply({
        content: 'Session hết hạn, sử dụng lại lệnh để tiếp tục.',
        components: [disabledRow, disabledRow2]
      });
    });
  },
};

// Function to get random image from local JSON files
async function getLocalImage(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    if (Array.isArray(data)) {
      // If data is an array, select random item
      const randomIndex = Math.floor(Math.random() * data.length);
      return data[randomIndex].url || data[randomIndex];
    } else if (data.urls && Array.isArray(data.urls)) {
      // If data has urls array
      const randomIndex = Math.floor(Math.random() * data.urls.length);
      return data.urls[randomIndex];
    } else if (data.url) {
      // If data has a single url
      return data.url;
    }
    
    throw new Error('Invalid data format in JSON file');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

// Function to fetch data from API
async function fetchApi(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching from API ${url}:`, error);
    throw error;
  }
}
