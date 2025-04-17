const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bantx')
    .setDescription('Tài xỉu game for multiple players')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new tài xỉu game')
        .addIntegerOption(option =>
          option.setName('bet')
            .setDescription('The bet amount (minimum 50)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join the tài xỉu game in this channel'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave')
        .setDescription('Leave the tài xỉu game in this channel'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start the tài xỉu game in this channel'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End the tài xỉu game in this channel')),

  async execute(interaction) {
    try {
      // Initialize global game storage if not exists
      if (!global.taixiuGames) global.taixiuGames = new Map();
      
      const subcommand = interaction.options.getSubcommand();
      const channelId = interaction.channelId;
      const userId = interaction.user.id;
      
      // Get the existing game in this channel, if any
      const gameChannel = global.taixiuGames.get(channelId);
      
      switch (subcommand) {
        case 'create': {
          const betAmount = interaction.options.getInteger('bet');
          
          // Validate bet amount
          if (betAmount < 50) {
            return await interaction.reply({ content: '⚠ Số tiền cược phải lớn hơn hoặc bằng 50$!!', ephemeral: true });
          }
          
          // Check if user has enough money
          const hasEnoughMoney = await checkMoney(userId, betAmount);
          if (!hasEnoughMoney) {
            return await interaction.reply({ content: `⚠ Bạn không có đủ ${betAmount}$ để tạo bàn game mới!!`, ephemeral: true });
          }
          
          // Check if a game already exists in this channel
          if (global.taixiuGames.has(channelId)) {
            return await interaction.reply({ content: '⚠ Kênh này đã được mở bàn game!', ephemeral: true });
          }
          
          // Create new game
          const playerName = interaction.user.username;
          global.taixiuGames.set(channelId, {
            channelId,
            start: false, 
            author: userId,
            player: [{ name: playerName, userID: userId, choose: { status: false, msg: null } }],
            money: betAmount
          });
          
          await interaction.reply({
            content: `🥳 Đã tạo thành công bàn chơi game!\n=> Số tiền cược: ${betAmount}$\n=> Số thành viên tham gia: 1 thành viên\n=> Nếu muốn bắt đầu bàn game vui lòng sử dụng lệnh /bantx start\n=> Nếu muốn kết thúc bàn game vui lòng sử dụng lệnh /bantx end\n=> Tham gia nhóm game này vui lòng sử dụng lệnh /bantx join`
          });
          break;
        }
          
        case 'join': {
          // Check if a game exists in this channel
          if (!global.taixiuGames.has(channelId)) {
            return await interaction.reply({ content: '⚠ Kênh này hiện chưa có bàn game nào!\n=> Vui lòng hãy tạo bàn game mới để tham gia!', ephemeral: true });
          }
          
          // Check if the game has already started
          if (gameChannel.start) {
            return await interaction.reply({ content: '⚠ Hiện tại bàn game này đã bắt đầu từ trước!', ephemeral: true });
          }
          
          // Check if user has enough money
          const hasEnoughMoney = await checkMoney(userId, gameChannel.money);
          if (!hasEnoughMoney) {
            return await interaction.reply({ content: `⚠ Bạn không có đủ ${gameChannel.money}$ để tham gia bàn game này!`, ephemeral: true });
          }
          
          // Check if user is already in the game
          if (gameChannel.player.find(p => p.userID === userId)) {
            return await interaction.reply({ content: '⚠ Hiện tại bạn đã tham gia bàn game này!', ephemeral: true });
          }
          
          // Add user to the game
          const playerName = interaction.user.username;
          gameChannel.player.push({ name: playerName, userID: userId, choose: { status: false, msg: null } });
          global.taixiuGames.set(channelId, gameChannel);
          
          await interaction.reply({ content: `🥳 Bạn đã tham gia bàn game!\n=> Số thành viên hiện tại là ${gameChannel.player.length} thành viên` });
          break;
        }
          
        case 'leave': {
          // Check if a game exists in this channel
          if (!global.taixiuGames.has(channelId)) {
            return await interaction.reply({ content: '⚠ Kênh này hiện chưa có bàn game nào!', ephemeral: true });
          }
          
          // Check if user is in the game
          if (!gameChannel.player.find(p => p.userID === userId)) {
            return await interaction.reply({ content: '⚠ Bạn đã không có trong bàn game để rời!', ephemeral: true });
          }
          
          // Check if the game has already started
          if (gameChannel.start) {
            return await interaction.reply({ content: '⚠ Bàn game đã được bắt đầu không thể rời!', ephemeral: true });
          }
          
          // If user is the game creator, delete the game
          if (gameChannel.author === userId) {
            global.taixiuGames.delete(channelId);
            return await interaction.reply({ content: `🥺 ${interaction.user.username} đã rời khỏi bàn game, bàn game của kênh đã được giải tán!` });
          }
          
          // Remove user from the game
          const playerIndex = gameChannel.player.findIndex(p => p.userID === userId);
          gameChannel.player.splice(playerIndex, 1);
          global.taixiuGames.set(channelId, gameChannel);
          
          await interaction.reply({ content: '🥺 Bạn đã rời khỏi bàn game của kênh!' });
          await interaction.channel.send({ content: `🥺 ${interaction.user.username} đã rời khỏi bàn game!\n=> Hiện tại bàn game còn ${gameChannel.player.length} thành viên` });
          break;
        }
          
        case 'start': {
          // Check if a game exists in this channel
          if (!global.taixiuGames.has(channelId)) {
            return await interaction.reply({ content: '⚠ Kênh này hiện chưa có bàn game nào!', ephemeral: true });
          }
          
          // Check if user is the game creator
          if (gameChannel.author !== userId) {
            return await interaction.reply({ content: '⚠ Bạn không phải là người tạo ra bàn game này nên không thể bắt đầu game', ephemeral: true });
          }
          
          // Check if there are enough players
          if (gameChannel.player.length <= 1) {
            return await interaction.reply({ content: '⚠ Bàn game của bạn không có đủ thành viên để có thể bắt đầu!', ephemeral: true });
          }
          
          // Check if the game has already started
          if (gameChannel.start) {
            return await interaction.reply({ content: '⚠ Hiện tại bàn game này đã bắt đầu từ trước!', ephemeral: true });
          }
          
          // Start the game
          gameChannel.start = true;
          global.taixiuGames.set(channelId, gameChannel);
          
          await interaction.reply({ content: `🔊 GAME START: \n-> Xin mời ${gameChannel.player.length} người chơi nhắn 'tài' hoặc 'xỉu' trong kênh này!!!` });
          break;
        }
          
        case 'end': {
          // Check if a game exists in this channel
          if (!global.taixiuGames.has(channelId)) {
            return await interaction.reply({ content: '⚠ Kênh này hiện chưa có bàn game nào!', ephemeral: true });
          }
          
          // Check if user is the game creator
          if (gameChannel.author !== userId) {
            return await interaction.reply({ content: '⚠ Bạn không phải là người tạo ra bàn game nên không thể xóa bàn game', ephemeral: true });
          }
          
          // End the game
          global.taixiuGames.delete(channelId);
          
          await interaction.reply({ content: '🎆 Đã xóa bàn game!' });
          break;
        }
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `⚠ Có lỗi xảy ra: ${error.message}`, ephemeral: true });
    }
  }
};

// Adding message listener for gameplay
const messageListener = async (message) => {
  if (message.author.bot) return;
  
  const content = message.content.toLowerCase();
  if (content !== 'tài' && content !== 'xỉu') return;
  
  const channelId = message.channelId;
  const gameChannel = global.taixiuGames.get(channelId);
  
  if (!gameChannel || !gameChannel.start) return;
  
  const player = gameChannel.player.find(p => p.userID === message.author.id);
  if (!player) return;
  
  if (player.choose.status) {
    return message.reply('⚠ Bạn đã chọn rồi không thể chọn lại!');
  }
  
  // Update player's choice
  const playerIndex = gameChannel.player.findIndex(p => p.userID === message.author.id);
  gameChannel.player.splice(playerIndex, 1);
  
  if (content === 'tài') {
    gameChannel.player.push({ 
      name: player.name, 
      userID: message.author.id, 
      choose: { status: true, msg: 'tài' } 
    });
    message.channel.send(`👤 Người chơi ${player.name} đã chọn TÀI!!`);
  } else {
    gameChannel.player.push({ 
      name: player.name, 
      userID: message.author.id, 
      choose: { status: true, msg: 'xỉu' } 
    });
    message.channel.send(`👤 Người chơi ${player.name} đã chọn XỈU!!`);
  }
  
  // Check if all players have made their choice
  const allPlayersChosen = gameChannel.player.every(p => p.choose.status);
  
  if (allPlayersChosen) {
    const resultMessage = await message.channel.send('🥳 Đang lắc....');
    
    // Calculate result after 5 seconds
    setTimeout(async () => {
      try {
        await resultMessage.delete();
        
        const typ = ['tài', 'xỉu'];
        const ketqua = typ[Math.floor(Math.random() * typ.length)];
        
        const win = [];
        const lose = [];
        
        // Determine winners and losers
        if (ketqua === 'tài') {
          for (const p of gameChannel.player) {
            if (p.choose.msg === 'tài') {
              win.push({ name: p.name, userID: p.userID });
            } else {
              lose.push({ name: p.name, userID: p.userID });
            }
          }
        } else {
          for (const p of gameChannel.player) {
            if (p.choose.msg === 'xỉu') {
              win.push({ name: p.name, userID: p.userID });
            } else {
              lose.push({ name: p.name, userID: p.userID });
            }
          }
        }
        
        // Update player balances
        for (const w of win) {
          await updateMoney(w.userID, gameChannel.money * 3);
        }
        
        for (const l of lose) {
          await updateMoney(l.userID, -gameChannel.money);
        }
        
        // Prepare result message
        let resultStr = `💎 KẾT QUẢ: ${ketqua.toUpperCase()}\n\n🥳 Những người chiến thắng:\n`;
        
        for (let i = 0; i < win.length; i++) {
          resultStr += `${i + 1}. ${win[i].name}\n`;
        }
        
        if (lose.length > 0) {
          resultStr += '\n🥺 Những người thua trong ván này:\n';
          for (let i = 0; i < lose.length; i++) {
            resultStr += `${i + 1}. ${lose[i].name}\n`;
          }
        }
        
        resultStr += `\n🎁 Những người thắng nhận được [ ${gameChannel.money * 3}$ ]\n`;
        resultStr += `💰 Những người thua bị trừ [${gameChannel.money}$ ]`;
        
        // Remove the game
        global.taixiuGames.delete(channelId);
        
        // Send result
        message.channel.send(resultStr);
      } catch (error) {
        console.error(error);
        message.channel.send(`⚠ Có lỗi xảy ra: ${error.message}`);
      }
    }, 5000);
  }
  
  global.taixiuGames.set(channelId, gameChannel);
};

async function checkMoney(userId, amount) {
  try {
    const bankData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/bank.json'), 'utf8'));
    const userBalance = bankData[userId]?.money || 0;
    return userBalance >= parseInt(amount);
  } catch (error) {
    console.error('Error checking money:', error);
    return false;
  }
}

async function updateMoney(userId, amount) {
  try {
    const bankFilePath = path.join(__dirname, '../data/bank.json');
    const bankData = JSON.parse(fs.readFileSync(bankFilePath, 'utf8'));
    
    // Initialize user if not exists
    if (!bankData[userId]) {
      bankData[userId] = { money: 0 };
    }
    
    // Update balance
    bankData[userId].money += parseInt(amount);
    
    // Save updated data
    fs.writeFileSync(bankFilePath, JSON.stringify(bankData, null, 2));
    return true;
  } catch (error) {
    console.error('Error updating money:', error);
    return false;
  }
}

// Export the message listener to be registered in the main bot file
module.exports.messageListener = messageListener;
