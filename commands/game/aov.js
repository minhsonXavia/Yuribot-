const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aov')
    .setDescription('Một vài câu hỏi về AOV'),
  
  async execute(interaction) {
    try {
      // Create temporary directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      const msg = '[⚜️]=== 『AOV QUIZZ』 ===[⚜️]\n◆━━━━━━━━━━━━━━━━◆\n\n[⚜️]➜ Vị tướng nào có skill này?\n';
      const data = require('../data/aov.json');
      
      // Select a random hero
      const hero = data[Math.floor(Math.random() * data.length)];
      const newData = data.filter(item => item.name != hero.name);
      
      // Get 3 random different heroes
      const randomData = [];
      while (randomData.length < 3) {
        const _hero = newData[Math.floor(Math.random() * newData.length)];
        if (randomData.map(e => e.name).indexOf(_hero.name) == -1) {
          randomData.push(_hero);
        }
      }
      
      // Add the hero with random skills
      const heroesWithSkills = [hero, ...randomData].map(e => {
        return {
          name: e.name,
          skill: e.detail.skills[Math.floor(Math.random() * e.detail.skills.length)]
        }
      });
      
      // Pick a random hero to be the question
      const heroQuestion = heroesWithSkills[Math.floor(Math.random() * heroesWithSkills.length)];
      const skillInfo = {
        image: heroQuestion.skill.img,
        name: heroQuestion.skill.name,
      };
      
      const answer = heroQuestion.name;
      const options = heroesWithSkills.sort(() => Math.random() - 0.5).map(e => e.name);
      
      // Download skill image
      const imagePath = path.join(tempDir, 'skill.png');
      const imageResponse = await axios.get(skillInfo.image, { responseType: 'arraybuffer' });
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
      
      // Create message content
      let content = msg;
      for (let e in options) {
        content += ['A', 'B', 'C', 'D'][e] + '. ' + options[e] + '\n';
      }
      content += '\n[⚜️]➜ Trả lời bằng cách nhấn vào nút bên dưới';
      
      // Create attachment
      const attachment = new AttachmentBuilder(imagePath, { name: 'skill.png' });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('AOV Quiz')
        .setDescription(content)
        .setImage('attachment://skill.png')
        .setTimestamp();
      
      // Create buttons for options
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const row = new ActionRowBuilder();
      
      ['A', 'B', 'C', 'D'].forEach((letter, index) => {
        if (index < options.length) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`aov_${letter}_${options[index]}`)
              .setLabel(letter)
              .setStyle(ButtonStyle.Primary)
          );
        }
      });
      
      // Send the message
      const response = await interaction.reply({
        embeds: [embed],
        files: [attachment],
        components: [row],
        fetchReply: true
      });
      
      // Delete the temporary image
      fs.unlinkSync(imagePath);
      
      // Set up collector for button interactions
      const filter = i => i.customId.startsWith('aov_') && i.user.id === interaction.user.id;
      const collector = response.createMessageComponentCollector({ filter, time: 30000 });
      
      collector.on('collect', async i => {
        const selectedOption = i.customId.split('_')[2];
        
        if (selectedOption === answer) {
          await i.update({
            content: '[⚜️]➜ Câu trả lời chính xác!',
            embeds: [],
            files: [],
            components: []
          });
        } else {
          await i.update({
            content: '[⚜️]➜ Bạn đã trả lời sai!',
            embeds: [],
            files: [],
            components: []
          });
        }
        
        collector.stop();
      });
      
      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.editReply({
            content: '[⚜️]➜ Hết thời gian trả lời!',
            embeds: [],
            files: [],
            components: []
          });
        }
      });
      
    } catch (error) {
      console.error('Lỗi khi thực hiện lệnh AOV:', error);
      return interaction.reply({ 
        content: 'Đã xảy ra lỗi khi thực hiện câu đố AOV. Vui lòng thử lại sau.',
        ephemeral: true 
      });
    }
  }
};
