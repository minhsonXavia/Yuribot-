const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');

// Create banking directory and files if they don't exist
const initializeFiles = () => {
    const dir = path.join(__dirname, '../data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const pathData = path.join(dir, 'bank.json');
    if (!fs.existsSync(pathData)) fs.writeFileSync(pathData, "[]", "utf-8");
    
    const bankConfigPath = path.join(dir, 'bankConfig.json');
    if (!fs.existsSync(bankConfigPath)) {
        const defaultConfig = {
            maxBorrow: 1000,
            debtRate: 0.1,
            lastTotalMoney: 0,
            checkTime: new Date().toLocaleString(),
            admin: "1306552024568959016" // Admin's Discord ID
        };
        fs.writeFileSync(bankConfigPath, JSON.stringify(defaultConfig, null, 4), 'utf-8');
    }
};

// Initialize currency system - this would be replaced by your own economy system
class Currencies {
    static async getData(userId) {
        // In a real implementation, this would fetch from your database
        const userData = global.currencyData?.[userId] || { money: 0 };
        return userData;
    }
    
    static async getAll() {
        // In a real implementation, this would fetch all users from your database
        return Object.entries(global.currencyData || {}).map(([userID, data]) => ({
            userID,
            ...data
        }));
    }
    
    static async increaseMoney(userId, amount) {
        if (!global.currencyData) global.currencyData = {};
        if (!global.currencyData[userId]) global.currencyData[userId] = { money: 0 };
        global.currencyData[userId].money += amount;
        return true;
    }
    
    static async decreaseMoney(userId, amount) {
        if (!global.currencyData) global.currencyData = {};
        if (!global.currencyData[userId]) global.currencyData[userId] = { money: 0 };
        global.currencyData[userId].money -= amount;
        return true;
    }
}

// Initialize user system - this would be replaced by your own user system
class Users {
    static async getData(userId) {
        // In a real implementation, this would fetch from your database
        return {
            id: userId,
            name: global.client?.users?.cache?.get(userId)?.username || "Unknown User"
        };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Hệ thống ngân hàng của Yuri')
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Hiển thị thông tin trợ giúp về các lệnh ngân hàng'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('Đăng ký tài khoản ngân hàng mới'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Gửi tiền vào tài khoản ngân hàng của bạn')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số tiền muốn gửi')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Rút tiền từ tài khoản ngân hàng của bạn')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số tiền muốn rút')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Kiểm tra số dư tài khoản ngân hàng của bạn'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('borrow')
                .setDescription('Vay tiền từ ngân hàng')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số tiền muốn vay')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repay')
                .setDescription('Trả nợ cho ngân hàng')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số tiền muốn trả nợ')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('debt')
                .setDescription('Kiểm tra thông tin nợ của bạn'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('top')
                .setDescription('Xem danh sách người dùng giàu nhất'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Xem thông tin ngân hàng'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check-debt')
                .setDescription('Kiểm tra người dùng đang nợ quá hạn (Chỉ admin)')),
    
    async execute(interaction) {
        // Initialize files
        initializeFiles();
        
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        const amount = interaction.options.getInteger('amount');
        
        // Read banking data
        const pathData = path.join(__dirname, '../data/bank.json');
        let bankingData = JSON.parse(fs.readFileSync(pathData, "utf-8"));
        
        // Ensure bankingData is an array
        if (!Array.isArray(bankingData)) {
            bankingData = [];
            fs.writeFileSync(pathData, JSON.stringify(bankingData, null, 4));
        }
        
        // Read bank config
        const bankConfigPath = path.join(__dirname, '../data/bankConfig.json');
        let bankConfig = JSON.parse(fs.readFileSync(bankConfigPath, 'utf-8'));
        
        // Find user
        let userIndex = bankingData.findIndex(user => user.id === userId);
        let user = null;
        
        if (userIndex !== -1) {
            user = bankingData[userIndex];
        }
        
        const penaltyRate = 0.1; // 10% penalty for overdue debt
        
        // Handle each subcommand
        switch (subcommand) {
            case 'help': {
                const attachment = new AttachmentBuilder('https://i.imgur.com/cJkBO5P.png', { name: 'bank.png' });
                
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Yuri Bank - Hệ Thống Ngân Hàng')
                    .setDescription('Hệ thống ngân hàng ảo cho phép bạn gửi, rút, vay tiền và nhiều hơn nữa!')
                    .addFields(
                        { name: '`/bank register`', value: 'Đăng ký tài khoản ngân hàng mới' },
                        { name: '`/bank deposit [số tiền]`', value: 'Gửi tiền vào tài khoản ngân hàng của bạn' },
                        { name: '`/bank withdraw [số tiền]`', value: 'Rút tiền từ tài khoản ngân hàng của bạn' },
                        { name: '`/bank balance`', value: 'Kiểm tra số dư tài khoản và thông tin nợ' },
                        { name: '`/bank borrow [số tiền]`', value: 'Vay tiền từ ngân hàng (có lãi suất và hạn trả)' },
                        { name: '`/bank repay [số tiền]`', value: 'Trả nợ cho ngân hàng' },
                        { name: '`/bank debt`', value: 'Kiểm tra thông tin nợ của bạn' },
                        { name: '`/bank top`', value: 'Xem danh sách người dùng giàu nhất' },
                        { name: '`/bank info`', value: 'Xem thông tin tổng quan về ngân hàng' }
                    )
                    .setColor('#0099FF')
                    .setImage('https://i.imgur.com/cJkBO5P.png ')
                    .setFooter({ text: 'Yuri Bank - Hệ thống ngân hàng đáng tin cậy' });
                
                await interaction.reply({ embeds: [embed], files: [attachment] });
                break;
            }
            
            case 'register': {
                if (userIndex !== -1) {
                    return interaction.reply({ content: "❌ Bạn đã có tài khoản ngân hàng rồi!", ephemeral: true });
                }
                
                bankingData.push({
                    id: userId,
                    balance: 0,
                    debt: 0,
                    dueDate: null
                });
                
                fs.writeFileSync(pathData, JSON.stringify(bankingData, null, 4));
                
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Đăng Ký Tài Khoản Thành Công')
                    .setDescription('Chào mừng bạn đến với Yuri Bank!')
                    .addFields(
                        { name: 'Số Dư Hiện Tại', value: '0$', inline: true },
                        { name: 'Nợ Hiện Tại', value: '0$', inline: true }
                    )
                    .setColor('#00FF00')
                    .setTimestamp()
                    .setFooter({ text: 'Hãy dùng lệnh /bank deposit để bắt đầu gửi tiền' });
                
                await interaction.reply({ embeds: [embed] });
                break;
            }
            
            case 'deposit': {
                if (userIndex === -1) {
                    return interaction.reply({ 
                        content: "❌ Bạn chưa có tài khoản ngân hàng. Hãy dùng lệnh `/bank register` để đăng ký!", 
                        ephemeral: true 
                    });
                }
                
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: "❌ Số tiền không hợp lệ.", ephemeral: true });
                }
                
                const userMoney = (await Currencies.getData(userId)).money;
                if (userMoney < amount) {
                    return interaction.reply({ content: "❌ Bạn không có đủ tiền để gửi.", ephemeral: true });
                }
                
                user.balance += amount;
                await Currencies.decreaseMoney(userId, amount);
                
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Giao Dịch Ngân Hàng')
                    .setDescription(`✅ Bạn đã gửi ${amount}$ vào ngân hàng`)
                    .addFields({ name: 'Số Dư Hiện Tại', value: `${user.balance}$` })
                    .setColor('#00FF00')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
            }
            
            case 'withdraw': {
                if (userIndex === -1) {
                    return interaction.reply({ 
                        content: "❌ Bạn chưa có tài khoản ngân hàng. Hãy dùng lệnh `/bank register` để đăng ký!", 
                        ephemeral: true 
                    });
                }
                
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: "❌ Số tiền không hợp lệ.", ephemeral: true });
                }
                
                if (user.balance < amount) {
                    return interaction.reply({ content: "❌ Số dư trong ngân hàng không đủ.", ephemeral: true });
                }
                
                user.balance -= amount;
                await Currencies.increaseMoney(userId, amount);
                
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Giao Dịch Ngân Hàng')
                    .setDescription(`✅ Bạn đã rút ${amount}$ từ ngân hàng`)
                    .addFields({ name: 'Số Dư Hiện Tại', value: `${user.balance}$` })
                    .setColor('#00FF00')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
            }
            
            case 'balance': {
                if (userIndex === -1) {
                    return interaction.reply({ 
                        content: "❌ Bạn chưa có tài khoản ngân hàng. Hãy dùng lệnh `/bank register` để đăng ký!", 
                        ephemeral: true 
                    });
                }
                
                const userData = await Users.getData(userId);
                const userName = userData.name;
                const debt = user.debt || 0;
                const dueDate = user.dueDate || 0;
                
                const timeRemaining = dueDate ? Math.max(0, dueDate - Date.now()) : 0;
                const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
                const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
                const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
                
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Thông Tin Tài Khoản Ngân Hàng')
                    .addFields(
                        { name: 'Tên Người Dùng', value: userName, inline: true },
                        { name: 'Số Dư Hiện Tại', value: `${user.balance}$`, inline: true },
                        { name: 'Nợ Hiện Tại', value: `${debt}$`, inline: true }
                    )
                    .setColor('#0099FF')
                    .setTimestamp();
                
                if (debt > 0) {
                    embed.addFields({ name: 'Thời Gian Còn Lại Để Trả Nợ', value: `${days} ngày, ${hours} giờ, ${minutes} phút, ${seconds} giây` });
                }
                
                await interaction.reply({ embeds: [embed] });
                break;
            }
            
            case 'top': {
                try {
                    // Sort bank accounts by balance
                    const sortedBankingData = [...bankingData].sort((a, b) => b.balance - a.balance);
                    const top10 = sortedBankingData.slice(0, 10);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🏆 Top 10 Người Giàu Nhất')
                        .setColor('#FFD700')
                        .setTimestamp();
                    
                    let description = '';
                    let totalBalance = 0;
                    
                    for (let i = 0; i < top10.length; i++) {
                        const user = top10[i];
                        const name = (await Users.getData(user.id)).name;
                        description += `${i + 1}. ${name}: ${user.balance}$\n`;
                        totalBalance += user.balance;
                    }
                    
                    if (description === '') {
                        description = 'Chưa có người dùng nào!';
                    }
                    
                    embed.setDescription(description);
                    embed.setFooter({ text: `Tổng số tiền của ${bankingData.length} người dùng: ${totalBalance}$` });
                    
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.reply({ content: "❌ Đã xảy ra lỗi khi lấy dữ liệu người dùng.", ephemeral: true });
                }
                break;
            }
            
            case 'info': {
                try {
                    // Calculate total money in bank accounts
                    let totalBalance = 0;
                    for (let user of bankingData) {
                        totalBalance += user.balance;
                    }
                    
                    const percentageIncrease = ((totalBalance - bankConfig.lastTotalMoney) / Math.max(1, bankConfig.lastTotalMoney)) * 100;
                    let increaseNoti = '';
                    if (percentageIncrease > 0) increaseNoti = `📈 +${percentageIncrease.toFixed(2)}%`;
                    else if (percentageIncrease === 0) increaseNoti = `💹 Không thay đổi`;
                    else increaseNoti = `📉 -${Math.abs(percentageIncrease).toFixed(2)}%`;
                    
                    const currentTime = new Date();
                    const lastCheckTime = new Date(bankConfig.checkTime);
                    const timeDifference = currentTime - lastCheckTime;
                    const diffDays = Math.floor(timeDifference / (24 * 60 * 60 * 1000));
                    const diffHours = Math.floor((timeDifference % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                    const diffMinutes = Math.floor((timeDifference % (60 * 60 * 1000)) / (60 * 1000));
                    const diffSeconds = Math.floor((timeDifference % (60 * 1000)) / 1000);
                    
                    const adminName = (bankConfig.admin && global.client?.users?.cache?.get(bankConfig.admin)?.username) || "Chưa thiết lập";
                    
                    bankConfig.lastTotalMoney = totalBalance;
                    bankConfig.checkTime = currentTime.toLocaleString();
                    fs.writeFileSync(bankConfigPath, JSON.stringify(bankConfig, null, 4));
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🏦 Thông Tin Ngân Hàng Yuri')
                        .addFields(
                            { name: 'Vay Tối Đa', value: `${bankConfig.maxBorrow}$`, inline: true },
                            { name: 'Người Quản Lý Ngân Hàng', value: adminName, inline: true },
                            { name: 'Lãi Suất', value: `${bankConfig.debtRate * 100}%`, inline: true },
                            { name: 'Tổng Tiền Lưu Hành', value: `${totalBalance}$`, inline: true },
                            { name: 'Thống Kê', value: increaseNoti, inline: true },
                            { name: 'Thời Gian Từ Lần Kiểm Tra Trước', value: `${diffDays}n ${diffHours}g ${diffMinutes}p ${diffSeconds}s`, inline: true }
                        )
                        .setColor('#0099FF')
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.reply({ content: "❌ Đã xảy ra lỗi khi kiểm tra thông tin ngân hàng.", ephemeral: true });
                }
                break;
            }
            
            case 'borrow': {
                if (userIndex === -1) {
                    return interaction.reply({ 
                        content: "❌ Bạn chưa có tài khoản ngân hàng. Hãy dùng lệnh `/bank register` để đăng ký!", 
                        ephemeral: true 
                    });
                }
                
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: "❌ Số tiền không hợp lệ.", ephemeral: true });
                }
                
                if (user.debt >= bankConfig.maxBorrow) {
                    return interaction.reply({ content: "❌ Bạn không thể vay thêm tiền. Nợ của bạn đã vượt quá giới hạn cho phép.", ephemeral: true });
                }
                
                if (amount > bankConfig.maxBorrow) {
                    return interaction.reply({ content: `❌ Bạn chỉ có thể vay tối đa ${bankConfig.maxBorrow}$`, ephemeral: true });
                }
                
                user.debt += amount;
                user.dueDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
                await Currencies.increaseMoney(userId, amount);
                
                const dueDateFormatted = new Date(user.dueDate).toLocaleDateString('vi-VN');
                
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Khoản Vay Ngân Hàng')
                    .setDescription(`✅ Bạn đã vay ${amount}$`)
                    .addFields(
                        { name: 'Nợ Hiện Tại', value: `${user.debt}$`, inline: true },
                        { name: 'Hạn Trả Nợ', value: dueDateFormatted, inline: true }
                    )
                    .setColor('#FFA500')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
            }
            
            case 'repay': {
                if (userIndex === -1) {
                    return interaction.reply({ 
                        content: "❌ Bạn chưa có tài khoản ngân hàng. Hãy dùng lệnh `/bank register` để đăng ký!", 
                        ephemeral: true 
                    });
                }
                
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: "❌ Số tiền không hợp lệ.", ephemeral: true });
                }
                
                const userCurrentMoney = (await Currencies.getData(userId)).money;
                if (userCurrentMoney < amount) {
                    return interaction.reply({ content: "❌ Bạn không có đủ tiền để trả nợ.", ephemeral: true });
                }
                
                if (user.debt < amount) {
                    return interaction.reply({ content: "❌ Số tiền trả nợ vượt quá nợ hiện tại của bạn.", ephemeral: true });
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Trả Nợ Ngân Hàng')
                    .setColor('#00FF00')
                    .setTimestamp();
                
                // Apply penalty if overdue
                if (Date.now() > user.dueDate) {
                    const penalty = Math.round(user.debt * penaltyRate);
                    user.debt += penalty;
                    embed.setDescription(`⚠️ Bạn bị phạt ${penalty}$ vì trả nợ trễ hạn`)
                        .addFields({ name: 'Nợ Đã Cập Nhật', value: `${user.debt}$`, inline: true });
                    await interaction.reply({ embeds: [embed] });
                    break;
                }
                
                user.debt -= amount;
                await Currencies.decreaseMoney(userId, amount);
                
                if (user.debt === 0) {
                    user.dueDate = null;
                }
                
                embed.setDescription(`✅ Bạn đã trả ${amount}$`)
                    .addFields({ name: 'Nợ Còn Lại', value: `${user.debt}$`, inline: true });
                
                await interaction.reply({ embeds: [embed] });
                break;
            }
            
            case 'debt': {
                if (userIndex === -1) {
                    return interaction.reply({ 
                        content: "❌ Bạn chưa có tài khoản ngân hàng. Hãy dùng lệnh `/bank register` để đăng ký!", 
                        ephemeral: true 
                    });
                }
                
                if (user.debt === 0) {
                    await interaction.reply({ content: "💰 Bạn không có nợ.", ephemeral: false });
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('💸 Thông Tin Nợ')
                        .addFields(
                            { name: 'Nợ Hiện Tại', value: `${user.debt}$`, inline: true },
                            { name: 'Hạn Trả Nợ', value: new Date(user.dueDate).toLocaleString('vi-VN'), inline: true }
                        )
                        .setColor('#FF6347')
                        .setTimestamp();
                    
                    if (new Date(user.dueDate) < new Date()) {
                        let overdueDays = Math.floor((Date.now() - new Date(user.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                        embed.addFields({ name: '⚠️ Cảnh Báo', value: `Bạn đã quá hạn ${overdueDays} ngày!` });
                    }
                    
                    await interaction.reply({ embeds: [embed] });
                }
                break;
            }
            
            case 'check-debt': {
                // Check if user is admin
                if (userId !== bankConfig.admin) {
                    return interaction.reply({ content: "❌ Bạn không có quyền sử dụng lệnh này.", ephemeral: true });
                }
                
                try {
                    const overdueUsers = bankingData.filter(user => user.debt > 0 && new Date(user.dueDate) < new Date());
                    
                    if (overdueUsers.length === 0) {
                        return interaction.reply({ content: "Không có người dùng nào đang quá hạn nợ.", ephemeral: false });
                    }
                    
                    const embed = new EmbedBuilder()
                        .setTitle('⚠️ Danh Sách Nợ Quá Hạn')
                        .setDescription('Người dùng có nợ quá hạn:')
                        .setColor('#FF0000')
                        .setTimestamp();
                    
                    for (let i = 0; i < overdueUsers.length; i++) {
                        const user = overdueUsers[i];
                        const userName = (await Users.getData(user.id)).name;
                        const overdueDays = Math.floor((Date.now() - new Date(user.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                        embed.addFields({ 
                            name: `${i + 1}. ${userName}`, 
                            value: `Nợ: ${user.debt}$\nHạn Trả Nợ: ${new Date(user.dueDate).toLocaleString('vi-VN')}\nQuá Hạn: ${overdueDays} ngày`
                        });
                    }
                    
                    await interaction.reply({ 
                        embeds: [embed],
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 4,
                                        label: "Phạt Người Dùng Quá Hạn",
                                        custom_id: "punish_overdue"
                                    }
                                ]
                            }
                        ] 
                    });
                } catch (error) {
                    console.log(error);
                    await interaction.reply({ content: "❌ Đã xảy ra lỗi khi kiểm tra nợ quá hạn.", ephemeral: true });
                }
                break;
            }
            
            default:
                await interaction.reply({ 
                    content: "Lệnh không hợp lệ. Sử dụng `/bank help` để xem danh sách các lệnh.", 
                    ephemeral: true 
                });
        }
        
        // Save banking data
        fs.writeFileSync(pathData, JSON.stringify(bankingData, null, 4));
    }
};
