const { SlashCommandBuilder } = require('discord.js');
const path = require("path");
const { mkdirSync, writeFileSync, existsSync, createReadStream, readdirSync } = require("fs-extra");
const axios = require("axios");
const { 
    AttachmentBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle
} = require('discord.js');

// Ensure directories exist
const setupDirectories = () => {
    const dir = path.join(__dirname, '../data/coinmaster/datauser/');
    const cacheDir = path.join(__dirname, '../data/coinmaster/cache/');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
};

// Check user path
const checkPath = (type, userId) => {
    const pathGame = path.join(__dirname, '../data/coinmaster/datauser', `${userId}.json`);
    if (type === 1) return pathGame;
    if (type === 2) {
        if (existsSync(pathGame)) {
            return require(pathGame);
        }
        return null;
    }
};

// Image download function
const getImage = async (link) => {
    try {
        const response = await axios.get(link, { responseType: "arraybuffer" });
        const imagePath = path.join(__dirname, '../data/coinmaster/cache/coinmaster.png');
        writeFileSync(imagePath, Buffer.from(response.data));
        return imagePath;
    } catch (error) {
        console.error("Error downloading image:", error);
        return null;
    }
};

// Get spin result
const getSpin = (items, getItem, userId) => {
    const pathData = checkPath(2, userId);
    const userPath = checkPath(1, userId);
    
    const i = items.findIndex(index => index === getItem);
    
    if (i === 0) pathData.coins = parseInt(pathData.coins) + pathData.Island.level * 1000;
    if (i === 1) pathData.coins = parseInt(pathData.coins) + pathData.Island.level * 3000;
    if (i === 2) pathData.coins = parseInt(pathData.coins) + pathData.Island.level * 5000;
    if (i === 4) {
        if (pathData.shield !== 3) {
            pathData.spin = parseInt(pathData.spin) + 1;
            pathData.shield = parseInt(pathData.shield) + 1;
        }
    }
    if (i === 6) pathData.spin = parseInt(pathData.spin) + 1;
    if (i === 7) pathData.spin = parseInt(pathData.spin) + 2;
    if (i === 8) pathData.spin = parseInt(pathData.spin) + 5;
    
    writeFileSync(userPath, JSON.stringify(pathData, null, 4));
    return i;
};

// Check if user has enough money
const checkMoney = async (interaction, economy, amount) => {
    const userMoney = await economy.getMoney(interaction.user.id) || 0;
    if (userMoney < parseInt(amount)) {
        await interaction.reply({ content: 'Bạn không có đủ tiền cho giao dịch này!', ephemeral: true });
        return false;
    }
    return true;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinmaster')
        .setDescription('Chơi game Coin Master')
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('Đăng ký để chơi Coin Master'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('quay')
                .setDescription('Quay vòng quay để nhận phần thưởng')
                .addIntegerOption(option => 
                    option.setName('số_lượt')
                        .setDescription('Số lượt quay (1000 xu/lượt)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xây_dựng')
                .setDescription('Xây dựng trên đảo của bạn'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cửa_hàng')
                .setDescription('Truy cập cửa hàng để mua/bán xu hoặc lượt quay'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('thông_tin')
                .setDescription('Xem hồ sơ Coin Master của bạn'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bảng_xếp_hạng')
                .setDescription('Xem người chơi hàng đầu trên máy chủ'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tấn_công')
                .setDescription('Tấn công đảo của người chơi khác')
                .addUserOption(option => 
                    option.setName('mục_tiêu')
                        .setDescription('Người chơi bạn muốn tấn công')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trợ_giúp')
                .setDescription('Xem các lệnh và thông tin Coin Master')),
                
    async execute(interaction, client) {
        // Make sure directories exist
        setupDirectories();
        
        // For convenience, create a shorthand for checking user data
        const userData = checkPath(2, interaction.user.id);
        const userPath = checkPath(1, interaction.user.id);
        
        // Get the subcommand
        const subcommand = interaction.options.getSubcommand();
        
        // Reference to economy system (adjust based on your implementation)
        const economy = client.economy;

        switch (subcommand) {
            case 'register': {
                if (userData) {
                    return interaction.reply('Bạn đã đăng ký trong cơ sở dữ liệu!');
                }
                
                // Current date in local format
                const nDate = new Date().toLocaleString('en-US');
                
                // Create new user object
                const obj = {
                    name: interaction.user.username,
                    ID: interaction.user.id,
                    shield: 3,
                    coins: 20000,
                    attack: 3,
                    Island: {
                        level: 1,
                        coinsLV: 200,
                        data: {
                            tower: 0,
                            tree: 0,
                            pool: 0,
                            pet: 0
                        }
                    },
                    spin: 20,
                    timeRegister: nDate
                };
                
                writeFileSync(userPath, JSON.stringify(obj, null, 4));
                return interaction.reply('🐖 Đăng ký thành công!');
            }
            
            case 'quay': {
                if (!userData) {
                    const imagePath = await getImage('https://i.imgur.com/6NYfksi.gif');
                    const attachment = new AttachmentBuilder(imagePath);
                    return interaction.reply({ content: "Bạn chưa đăng ký để chơi!", files: [attachment] });
                }
                
                const spinCount = interaction.options.getInteger('số_lượt');
                
                if (spinCount <= 0) {
                    return interaction.reply('Số lượt quay phải lớn hơn 0!');
                }
                
                const totalCost = spinCount * 1000;
                
                if (userData.coins < totalCost) {
                    return interaction.reply(`Bạn không đủ xu! Cần ${totalCost} xu cho ${spinCount} lượt quay.`);
                }
                
                // Decrease coins
                userData.coins = parseInt(userData.coins) - totalCost;
                userData.spin = parseInt(userData.spin) + spinCount;
                writeFileSync(userPath, JSON.stringify(userData, null, 4));
                
                return interaction.reply(`Bạn đã mua ${spinCount} lượt quay với giá ${totalCost} xu. Tổng số lượt quay hiện tại: ${userData.spin}`);
            }
            
            case 'xây_dựng': {
                if (!userData) {
                    const imagePath = await getImage('https://i.imgur.com/zn0ifgY.gif');
                    const attachment = new AttachmentBuilder(imagePath);
                    return interaction.reply({ content: "Bạn chưa đăng ký để chơi!", files: [attachment] });
                }
                
                if (userData.coins < 10000) {
                    return interaction.reply('Bạn cần 10.000 xu để xây dựng một công trình!');
                }
                
                // Create building options
                const buildingOptions = [
                    { label: `Tháp (${userData.Island.data.tower}/50)`, value: 'tower' },
                    { label: `Cây (${userData.Island.data.tree}/50)`, value: 'tree' },
                    { label: `Hồ bơi (${userData.Island.data.pool}/50)`, value: 'pool' },
                    { label: `Thú cưng (${userData.Island.data.pet}/50)`, value: 'pet' }
                ];
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('build-selection')
                            .setPlaceholder('Chọn công trình để xây dựng')
                            .addOptions(buildingOptions)
                    );
                
                await interaction.reply({
                    content: 'Bạn muốn xây dựng gì trên đảo của mình?',
                    components: [row]
                });
                
                // Handle selection
                const filter = i => i.customId === 'build-selection' && i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
                
                collector.on('collect', async i => {
                    const building = i.values[0];
                    
                    if (userData.Island.data[building] >= 50) {
                        return i.update({ content: "Khu vực này đã đạt cấp độ tối đa!", components: [] });
                    }
                    
                    // Reduce coins and increase building level
                    userData.coins = userData.coins - 10000;
                    userData.Island.data[building] = userData.Island.data[building] + 1;
                    
                    // Check if island should level up
                    if (userData.Island.data.tower >= 50 && 
                        userData.Island.data.tree >= 50 && 
                        userData.Island.data.pool >= 50 && 
                        userData.Island.data.pet >= 50) {
                        
                        userData.Island.level = userData.Island.level + 1;
                        userData.Island.coinsLV = userData.Island.coinsLV + 100;
                        userData.Island.data.tower = 0;
                        userData.Island.data.tree = 0;
                        userData.Island.data.pool = 0;
                        userData.Island.data.pet = 0;
                        
                        await i.update({ 
                            content: `Xây dựng thành công! Đảo của bạn đã được nâng cấp lên Cấp ${userData.Island.level}!`,
                            components: []
                        });
                    } else {
                        const buildingNames = { 'tower': 'Tháp', 'tree': 'Cây', 'pool': 'Hồ bơi', 'pet': 'Thú cưng' };
                        await i.update({ 
                            content: `Xây dựng thành công! ${buildingNames[building]}: ${userData.Island.data[building]}/50`,
                            components: []
                        });
                    }
                    
                    writeFileSync(userPath, JSON.stringify(userData, null, 4));
                });
                
                collector.on('end', collected => {
                    if (collected.size === 0) {
                        interaction.followUp({ content: 'Đã hết thời gian chọn.', ephemeral: true });
                    }
                });
                
                break;
            }
            
            case 'cửa_hàng': {
                if (!userData) {
                    const imagePath = await getImage('https://i.imgur.com/zn0ifgY.gif');
                    const attachment = new AttachmentBuilder(imagePath);
                    return interaction.reply({ content: "Bạn chưa đăng ký để chơi!", files: [attachment] });
                }
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('shop-selection')
                            .setPlaceholder('Chọn một lựa chọn cửa hàng')
                            .addOptions([
                                {
                                    label: 'Đổi tiền thành xu trò chơi',
                                    description: '0% hoa hồng',
                                    value: 'buy_coins'
                                },
                                {
                                    label: 'Đổi xu trò chơi thành tiền',
                                    description: '0% hoa hồng',
                                    value: 'sell_coins'
                                },
                                {
                                    label: 'Mua lượt quay',
                                    description: '10 lượt quay với giá 2000 tiền',
                                    value: 'buy_spins'
                                }
                            ])
                    );
                
                await interaction.reply({
                    content: 'Chào mừng đến với cửa hàng! Bạn muốn làm gì?',
                    components: [row]
                });
                
                // Handle shop selection
                const filter = i => i.customId === 'shop-selection' && i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
                
                collector.on('collect', async i => {
                    // Create a modal for amount input
                    const modal = new ModalBuilder()
                        .setCustomId(`shop-${i.values[0]}`)
                        .setTitle('Giao dịch Cửa hàng');
                    
                    // Add input field based on selection
                    if (i.values[0] === 'buy_coins') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('amount')
                                    .setLabel('Bạn muốn đổi bao nhiêu tiền thành xu?')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Nhập số lượng')
                                    .setRequired(true)
                            )
                        );
                    } else if (i.values[0] === 'sell_coins') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('amount')
                                    .setLabel('Bạn muốn đổi bao nhiêu xu thành tiền?')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Nhập số lượng')
                                    .setRequired(true)
                            )
                        );
                    } else if (i.values[0] === 'buy_spins') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('amount')
                                    .setLabel('Bạn muốn mua bao nhiêu lượt? (200 tiền/lượt)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Nhập số lượng')
                                    .setRequired(true)
                            )
                        );
                    }
                    
                    await i.showModal(modal);
                });
                
                // Handle modal submissions
                client.on('interactionCreate', async interaction => {
                    if (!interaction.isModalSubmit()) return;
                    
                    if (interaction.customId.startsWith('shop-')) {
                        const transaction = interaction.customId.split('-')[1];
                        const amount = parseInt(interaction.fields.getTextInputValue('amount'));
                        
                        if (isNaN(amount) || amount <= 0) {
                            return interaction.reply({ content: 'Vui lòng nhập một số dương hợp lệ!', ephemeral: true });
                        }
                        
                        // Process transaction based on type
                        if (transaction === 'buy_coins') {
                            // Check if user has enough money
                            if (!(await checkMoney(interaction, economy, amount))) return;
                            
                            // Update user data
                            await economy.removeMoney(interaction.user.id, amount);
                            userData.coins = userData.coins + amount;
                            writeFileSync(userPath, JSON.stringify(userData, null, 4));
                            
                            await interaction.reply(`Đã thêm thành công ${amount} xu vào tài khoản trò chơi của bạn!`);
                        }
                        else if (transaction === 'sell_coins') {
                            // Check if user has enough coins
                            if (userData.coins < amount) {
                                return interaction.reply({ content: "Bạn không có đủ xu cho giao dịch này!", ephemeral: true });
                            }
                            
                            // Update user data
                            userData.coins = userData.coins - amount;
                            await economy.addMoney(interaction.user.id, amount);
                            writeFileSync(userPath, JSON.stringify(userData, null, 4));
                            
                            await interaction.reply(`Đã rút thành công ${amount} xu từ tài khoản trò chơi của bạn!`);
                        }
                        else if (transaction === 'buy_spins') {
                            const cost = amount * 200;
                            
                            // Check if user has enough money
                            if (!(await checkMoney(interaction, economy, cost))) return;
                            
                            // Update user data
                            await economy.removeMoney(interaction.user.id, cost);
                            userData.spin = userData.spin + amount;
                            writeFileSync(userPath, JSON.stringify(userData, null, 4));
                            
                            await interaction.reply(`Đã mua thành công ${amount} lượt quay với giá ${cost} tiền!`);
                        }
                    }
                });
                
                break;
            }
            
            case 'thông_tin': {
                if (!userData) {
                    const imagePath = await getImage('https://i.imgur.com/zn0ifgY.gif');
                    const attachment = new AttachmentBuilder(imagePath);
                    return interaction.reply({ content: "Bạn chưa đăng ký để chơi!", files: [attachment] });
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('🏝️ HỒ SƠ COINMASTER 🏝️')
                    .setColor('#0099ff')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        { name: 'Cấp độ đảo', value: `${userData.Island.level}`, inline: true },
                        { name: 'Lượt quay còn lại', value: `${userData.spin}`, inline: true },
                        { name: 'Khiên', value: `${userData.shield}`, inline: true },
                        { name: 'Lượt tấn công', value: `${userData.attack || 3}`, inline: true },
                        { name: 'Xu', value: `${userData.coins}`, inline: true },
                        { name: 'Công trình trên đảo', value: 
                            `Tháp: ${userData.Island.data.tower}/50\n` +
                            `Cây: ${userData.Island.data.tree}/50\n` +
                            `Hồ bơi: ${userData.Island.data.pool}/50\n` +
                            `Thú cưng: ${userData.Island.data.pet}/50`
                        }
                    )
                    .setFooter({ text: `Đăng ký vào: ${userData.timeRegister}` });
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'bảng_xếp_hạng': {
                if (!userData) {
                    const imagePath = await getImage('https://i.imgur.com/zn0ifgY.gif');
                    const attachment = new AttachmentBuilder(imagePath);
                    return interaction.reply({ content: "Bạn chưa đăng ký để chơi!", files: [attachment] });
                }
                
                const data = readdirSync(path.join(__dirname, '../data/coinmaster/datauser'));
                if (data.length < 3) {
                    return interaction.reply('Cần có ít nhất 3 người chơi trên máy chủ để xem bảng xếp hạng hàng đầu!');
                }
                
                // Get all player data
                const players = [];
                for (let i of data) {
                    const playerData = require(path.join(__dirname, '../data/coinmaster/datauser', i));
                    players.push(playerData);
                }
                
                // Sort by island level
                players.sort((a, b) => b.Island.level - a.Island.level);
                
                // Create embed with top 3 players
                const embed = new EmbedBuilder()
                    .setTitle('🏆 CẤP ĐỘ ĐẢO CAO NHẤT 🏆')
                    .setColor('#FFD700')
                    .setDescription('Những người chơi có đảo cấp cao nhất:');
                
                // Add top 3 (or as many as available)
                const topCount = Math.min(players.length, 3);
                for (let i = 0; i < topCount; i++) {
                    const medals = ['🥇', '🥈', '🥉'];
                    embed.addFields({
                        name: `${medals[i]} ${i+1}. ${players[i].name}`,
                        value: `Cấp độ đảo: ${players[i].Island.level}\nXu: ${players[i].coins}`
                    });
                }
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'tấn_công': {
                if (!userData) {
                    const imagePath = await getImage('https://i.imgur.com/zn0ifgY.gif');
                    const attachment = new AttachmentBuilder(imagePath);
                    return interaction.reply({ content: "Bạn chưa đăng ký để chơi!", files: [attachment] });
                }
                
                // Check if user has attack attempts left
                if (!userData.attack) userData.attack = 3;
                
                if (userData.attack <= 0) {
                    return interaction.reply('Bạn đã hết lượt tấn công! Chờ reset hàng ngày hoặc quay để nhận thêm.');
                }
                
                const targetUser = interaction.options.getUser('mục_tiêu');
                
                // Can't attack yourself
                if (targetUser.id === interaction.user.id) {
                    return interaction.reply('Bạn không thể tấn công chính mình!');
                }
                
                // Check if target user is registered
                const targetData = checkPath(2, targetUser.id);
                const targetPath = checkPath(1, targetUser.id);
                
                if (!targetData) {
                    return interaction.reply(`${targetUser.username} chưa đăng ký chơi Coin Master!`);
                }
                
                // Check for shield
                if (targetData.shield > 0) {
                    targetData.shield = targetData.shield - 1;
                    writeFileSync(targetPath, JSON.stringify(targetData, null, 4));
                    
                    // Reduce attacker's attack count
                    userData.attack = userData.attack - 1;
                    writeFileSync(userPath, JSON.stringify(userData, null, 4));
                    
                    return interaction.reply(`Cuộc tấn công đã bị chặn bởi khiên! ${targetUser.username} còn ${targetData.shield} khiên.`);
                }
                
                // Get a random building to attack
                const buildings = ['tower', 'tree', 'pool', 'pet'];
                const buildingNames = { 'tower': 'Tháp', 'tree': 'Cây', 'pool': 'Hồ bơi', 'pet': 'Thú cưng' };
                
                // Find non-zero buildings
                const availableBuildings = buildings.filter(b => targetData.Island.data[b] > 0);
                
                if (availableBuildings.length === 0) {
                    return interaction.reply(`${targetUser.username} không có công trình nào để tấn công!`);
                }
                
                const randomBuilding = availableBuildings[Math.floor(Math.random() * availableBuildings.length)];
                
                // Reduce building value
                targetData.Island.data[randomBuilding] = Math.max(0, targetData.Island.data[randomBuilding] - 1);
                writeFileSync(targetPath, JSON.stringify(targetData, null, 4));
                
                // Reduce attacker's attack count
                userData.attack = userData.attack - 1;
                writeFileSync(userPath, JSON.stringify(userData, null, 4));
                
                // Try to DM the target
                try {
                    await targetUser.send(`Bạn đã bị tấn công bởi ${interaction.user.username}! ${buildingNames[randomBuilding]} của bạn đã bị hư hại.`);
                } catch (error) {
                    console.error("Không thể gửi DM đến người chơi bị tấn công", error);
                }
                
                return interaction.reply(`Bạn đã tấn công thành công ${buildingNames[randomBuilding]} của ${targetUser.username}! Còn ${userData.attack} lượt tấn công.`);
            }
            
            case 'trợ_giúp': {
                const embed = new EmbedBuilder()
                    .setTitle('🏝️ TRỢ GIÚP COINMASTER 🏝️')
                    .setColor('#00FFFF')
                    .setDescription('Chào mừng đến với Coin Master! Xây dựng đảo của bạn và trở thành người chơi giàu nhất!')
                    .addFields(
                        { name: '/coinmaster register', value: 'Đăng ký để chơi trò chơi' },
                        { name: '/coinmaster quay', value: 'Quay vòng quay để nhận phần thưởng (1000 xu/lượt)' },
                        { name: '/coinmaster xây_dựng', value: 'Xây dựng công trình trên đảo của bạn (10000 xu/công trình)' },
                        { name: '/coinmaster cửa_hàng', value: 'Đổi tiền/xu hoặc mua lượt quay' },
                        { name: '/coinmaster thông_tin', value: 'Xem hồ sơ trò chơi của bạn' },
                        { name: '/coinmaster bảng_xếp_hạng', value: 'Xem người chơi hàng đầu trên máy chủ' },
                        { name: '/coinmaster tấn_công', value: 'Tấn công đảo của người chơi khác' }
                    )
                    .setImage('https://i.imgur.com/rQPzm8J.jpeg')
                    .setFooter({ text: 'Chúc vui vẻ khi chơi Coin Master!' });
                
                return interaction.reply({ embeds: [embed] });
            }
            
            default:
                return interaction.reply('Lệnh phụ không hợp lệ! Sử dụng `/coinmaster trợ_giúp` để xem tất cả các lệnh có sẵn.');
        }
    }
};
