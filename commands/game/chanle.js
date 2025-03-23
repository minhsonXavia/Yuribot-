const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Function to get or initialize money data
function getMoneyData() {
    const moneyPath = path.join(__dirname, '../data/money.json');
    
    if (!fs.existsSync(moneyPath)) {
        fs.writeFileSync(moneyPath, JSON.stringify({}), 'utf8');
        return {};
    }
    
    return JSON.parse(fs.readFileSync(moneyPath, 'utf8'));
}

// Function to save money data
function saveMoneyData(data) {
    const moneyPath = path.join(__dirname, '../data/money.json');
    fs.writeFileSync(moneyPath, JSON.stringify(data, null, 2), 'utf8');
}

// Currency functions
const Currencies = {
    getData: async (userId) => {
        const moneyData = getMoneyData();
        if (!moneyData[userId]) {
            moneyData[userId] = { money: 0 };
            saveMoneyData(moneyData);
        }
        return moneyData[userId];
    },
    increaseMoney: async (userId, amount) => {
        const moneyData = getMoneyData();
        if (!moneyData[userId]) moneyData[userId] = { money: 0 };
        moneyData[userId].money += amount;
        saveMoneyData(moneyData);
        return moneyData[userId];
    },
    decreaseMoney: async (userId, amount) => {
        const moneyData = getMoneyData();
        if (!moneyData[userId]) moneyData[userId] = { money: 0 };
        moneyData[userId].money -= amount;
        saveMoneyData(moneyData);
        return moneyData[userId];
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chanle-choose')
        .setDescription('Choose even or odd and place your bet')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Choose even or odd')
                .setRequired(true)
                .addChoices(
                    { name: 'Even', value: 'even' },
                    { name: 'Odd', value: 'odd' }
                ))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        try {
            const { channelId, user } = interaction;
            const choice = interaction.options.getString('choice');
            const bet = interaction.options.getInteger('bet');
            
            // Check if user has enough money for the bet
            const userData = await Currencies.getData(user.id);
            if (userData.money < bet) {
                return await interaction.reply(`You don't have enough money for this bet! Your balance: ${userData.money}$`);
            }
            
            // Send processing message
            await interaction.reply(`${user.username} has chosen ${choice} and bet ${bet}$`);
            
            const processingMsg = await interaction.channel.send({
                content: 'Checking results...',
                files: [{
                    attachment: 'https://i.imgur.com/P3UEpfF.gif',
                    name: 'processing.gif'
                }]
            });
            
            // Determine result
            const choices = ['even', 'odd'];
            const result = choices[Math.floor(Math.random() * choices.length)];
            
            // Process after 3 seconds
            setTimeout(async () => {
                // Delete processing message
                await processingMsg.delete().catch(console.error);
                
                // Determine if user won or lost
                const won = choice === result;
                
                // Update user's money
                if (won) {
                    await Currencies.increaseMoney(user.id, bet);
                } else {
                    await Currencies.decreaseMoney(user.id, bet);
                }
                
                // Get updated user data
                const updatedUserData = await Currencies.getData(user.id);
                
                // Format result message
                let resultMessage = `RESULT: ${result.toUpperCase()}\n\n`;
                
                if (won) {
                    resultMessage += `**${user.username} WON ${bet}$!**\n`;
                } else {
                    resultMessage += `**${user.username} LOST ${bet}$!**\n`;
                }
                
                resultMessage += `New balance: ${updatedUserData.money}$`;
                
                // Get appropriate result image
                const images = result === 'even' 
                    ? [
                        "https://i.imgur.com/6fIJU1q.jpg", 
                        "https://i.imgur.com/XPg6Uvq.jpg", 
                        "https://i.imgur.com/IWjB9kN.jpg", 
                        "https://i.imgur.com/XVxgPhY.png", 
                        "https://i.imgur.com/dRzktqf.png"
                    ]
                    : [
                        "https://i.imgur.com/u1DjwX0.png", 
                        "https://i.imgur.com/unnBcv9.png", 
                        "https://i.imgur.com/181R8Te.jpg", 
                        "https://i.imgur.com/y67IGtv.jpg", 
                        "https://i.imgur.com/y67IGtv.jpg"
                    ];
                
                const randomImage = images[Math.floor(Math.random() * images.length)];
                
                // Send final result
                await interaction.channel.send({
                    content: resultMessage,
                    files: [{
                        attachment: randomImage,
                        name: 'result.jpg'
                    }]
                });
                
            }, 3000);
            
        } catch (error) {
            console.error(error);
            await interaction.reply('An error occurred while processing your choice.');
        }
    }
};
