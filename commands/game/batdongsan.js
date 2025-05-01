const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// File paths
const PROPERTIES_PATH = path.join(__dirname, '../data/nhacua.json');
const PLAYERS_PATH = path.join(__dirname, '../data/doanhnhan.json');
const MARKET_PATH = path.join(__dirname, '../data/market.json');

// Utility functions for reading and writing JSON files
function readJSONFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            const directory = path.dirname(filePath);
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            fs.writeFileSync(filePath, '[]');
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return [];
    }
}

function writeJSONFile(filePath, data) {
    try {
        const directory = path.dirname(filePath);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
    }
}

// Player management functions
function getPlayer(userId) {
    const players = readJSONFile(PLAYERS_PATH);
    return players.find(player => player.userId === userId) || null;
}

function savePlayer(playerData) {
    const players = readJSONFile(PLAYERS_PATH);
    const index = players.findIndex(player => player.userId === playerData.userId);
    
    if (index !== -1) {
        players[index] = playerData;
    } else {
        players.push(playerData);
    }
    
    return writeJSONFile(PLAYERS_PATH, players);
}

// Property functions
function getProperty(propertyId) {
    const properties = readJSONFile(PROPERTIES_PATH);
    return properties.find(prop => prop.id === propertyId) || null;
}

function getMarketMultiplier() {
    const marketData = readJSONFile(MARKET_PATH);
    return marketData.marketMultiplier || 1.0;
}

// Format money
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + " VNĐ";
}

// Main module export with all subcommands
module.exports = {
    data: new SlashCommandBuilder()
        .setName('yuribatdongsan')
        .setDescription('Real Estate game commands')
        
        // Login/Register subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('register')
                .setDescription('Đăng nhập mẹ mày đê')
                .addStringOption(option => 
                    option.setName('username')
                        .setDescription('tên cụ m vào')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('password')
                        .setDescription('mật khẩu đâu')
                        .setRequired(true)))
        
        // Buy property subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('buy')
                .setDescription('mua mẹ mày nhà đê')
                .addStringOption(option => 
                    option.setName('property-name')
                        .setDescription('nổ cái tên hoặc ID nhà mẹ mày đê')
                        .setRequired(true)))
        
        // Sell property subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('sell')
                .setDescription('bán mẹ mày nhà đê')
                .addStringOption(option => 
                    option.setName('property-name')
                        .setDescription('nổ tên hoặc ID nhà tao thanh lí')
                        .setRequired(true)))
        
        // View properties subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('portfolio')
                .setDescription('xem mẹ mày nhà mày đê'))
        
        // Upgrade property subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('upgrade')
                .setDescription('nâng cấp nhà mẹ mày đê')
                .addStringOption(option => 
                    option.setName('property-name')
                        .setDescription('nổ tên hoặc ID ra')
                        .setRequired(true)))
        
        // Rent property subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('rent')
                .setDescription('hết tiền thì thuê đê')
                .addStringOption(option => 
                    option.setName('property-name')
                        .setDescription('nổ tên nhà muốn thuê/ko cho thuê')
                        .setRequired(true)))
        
        // Market prices subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('market')
                .setDescription('nổ mẹ cái quảng cáo đê'))
        
        // Auction subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('auction')
                .setDescription('đấu giá mẹ m đê')
                .addStringOption(option => 
                    option.setName('property-name')
                        .setDescription('Name or ID of the property you want to bid on')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('bid')
                        .setDescription('xin cái giá phải trả đi em')
                        .setRequired(true)))
                
        // Rich list subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('richlist')
                .setDescription('top richkid vi en'))
        
        // Daily missions subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('daily')
                .setDescription('nhiệm vụ hằng ngày ý mà'))
        
        // Gift money subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('gift')
                .setDescription('chuyển tiền')
                .addUserOption(option => 
                    option.setName('player')
                        .setDescription('tag cụ mày vợ để chuyển đê')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('amount')
                        .setDescription('nổ cái bao tiền')
                        .setRequired(true)))
        
        // Server stats subcommand
        .addSubcommand(subcommand => 
            subcommand
                .setName('serverstats')
                .setDescription('bố xem sever giàu như nào')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'register':
                await this.handleRegister(interaction);
                break;
            case 'buy':
                await this.handleBuy(interaction);
                break;
            case 'sell':
                await this.handleSell(interaction);
                break;
            case 'portfolio':
                await this.handlePortfolio(interaction);
                break;
            case 'upgrade':
                await this.handleUpgrade(interaction);
                break;
            case 'rent':
                await this.handleRent(interaction);
                break;
            case 'market':
                await this.handleMarket(interaction);
                break;
            case 'auction':
                await this.handleAuction(interaction);
                break;
            case 'richlist':
                await this.handleRichList(interaction);
                break;
            case 'daily':
                await this.handleDaily(interaction);
                break;
            case 'gift':
                await this.handleGift(interaction);
                break;
            case 'serverstats':
                await this.handleServerStats(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown subcommand. Please use one of the available real estate commands.',
                    ephemeral: true
                });
        }
    },

    // Handler methods for each subcommand
    async handleRegister(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const userId = interaction.user.id;
        const username = interaction.options.getString('username');
        const password = interaction.options.getString('password');
        
        let players = readJSONFile(PLAYERS_PATH);
        let player = players.find(p => p.userId === userId);
        
        if (!player) {
            // Create new account
            player = {
                userId: userId,
                username: username,
                password: password, // In a real app, this should be hashed
                cash: 1000000, // Starting cash
                properties: [],
                loan: 0,
                bankSavings: 0,
                lastDailyMission: null
            };
            
            players.push(player);
            writeJSONFile(PLAYERS_PATH, players);
            
            await interaction.editReply({
                content: `Welcome to the Real Estate system!\nYour account has been created with an initial balance of: ${formatMoney(player.cash)}.`,
                ephemeral: true
            });
        } else {
            // Check password
            if (player.password === password) {
                await interaction.editReply({
                    content: `Login successful! Current balance: ${formatMoney(player.cash)}`,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: `Incorrect password. Please try again.`,
                    ephemeral: true
                });
            }
        }
    },

    async handleBuy(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const propertyQuery = interaction.options.getString('property-name');
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        // Get property list
        const properties = readJSONFile(PROPERTIES_PATH);
        
        // Find property by ID or name
        const property = properties.find(
            p => p.id === propertyQuery || 
            p.name.toLowerCase().includes(propertyQuery.toLowerCase())
        );
        
        if (!property) {
            return await interaction.editReply(`Property with name or ID "${propertyQuery}" not found.`);
        }
        
        // Check if player already owns this property
        if (player.properties.some(p => p.propertyId === property.id)) {
            return await interaction.editReply(`You already own "${property.name}".`);
        }
        
        // Calculate actual price based on market fluctuation
        const marketMultiplier = getMarketMultiplier();
        const actualPrice = Math.round(property.price * marketMultiplier);
        
        // Check if player has enough money
        if (player.cash < actualPrice) {
            return await interaction.editReply(`You don't have enough money to buy "${property.name}". Current price: ${formatMoney(actualPrice)}, Your balance: ${formatMoney(player.cash)}`);
        }
        
        // Process transaction
        player.cash -= actualPrice;
        player.properties.push({
            propertyId: property.id,
            boughtPrice: actualPrice,
            level: property.level || 1,
            rented: false,
            purchaseDate: new Date().toISOString()
        });
        
        // Save player data
        savePlayer(player);
        
        const embed = new EmbedBuilder()
            .setTitle('🏠 Transaction Successful!')
            .setDescription(`You successfully purchased "${property.name}"`)
            .addFields(
                { name: 'Purchase Price', value: formatMoney(actualPrice), inline: true },
                { name: 'Remaining Balance', value: formatMoney(player.cash), inline: true },
                { name: 'Rental Income', value: formatMoney(property.rent_income), inline: true }
            )
            .setColor('#2ecc71')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handleSell(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const propertyQuery = interaction.options.getString('property-name');
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        // Check if player has any properties
        if (!player.properties || player.properties.length === 0) {
            return await interaction.editReply('You don\'t own any properties yet.');
        }
        
        // Find property in player's portfolio
        const playerPropertyIndex = player.properties.findIndex(p => {
            const fullProperty = getProperty(p.propertyId);
            return p.propertyId === propertyQuery || 
                  (fullProperty && fullProperty.name.toLowerCase().includes(propertyQuery.toLowerCase()));
        });
        
        if (playerPropertyIndex === -1) {
            return await interaction.editReply(`You don't own a property with name or ID "${propertyQuery}".`);
        }
        
        const playerProperty = player.properties[playerPropertyIndex];
        const property = getProperty(playerProperty.propertyId);
        
        if (!property) {
            return await interaction.editReply('Property information not found. Please contact an administrator.');
        }
        
        // Calculate selling price based on market conditions and property level
        const marketMultiplier = getMarketMultiplier();
        const levelMultiplier = 1 + ((playerProperty.level - 1) * 0.2); // Each level adds 20% value
        const sellingPrice = Math.round(property.price * marketMultiplier * levelMultiplier);
        
        // Process transaction
        player.cash += sellingPrice;
        player.properties.splice(playerPropertyIndex, 1);
        
        // Save player data
        savePlayer(player);
        
        // Calculate profit/loss
        const profit = sellingPrice - playerProperty.boughtPrice;
        const profitText = profit >= 0 ? 
            `Profit: ${formatMoney(profit)} (+${Math.round(profit/playerProperty.boughtPrice*100)}%)` : 
            `Loss: ${formatMoney(Math.abs(profit))} (-${Math.round(Math.abs(profit)/playerProperty.boughtPrice*100)}%)`;
        
        const embed = new EmbedBuilder()
            .setTitle('🏠 Property Sold Successfully!')
            .setDescription(`You sold "${property.name}" for ${formatMoney(sellingPrice)}`)
            .addFields(
                { name: 'Original Purchase Price', value: formatMoney(playerProperty.boughtPrice), inline: true },
                { name: 'Selling Price', value: formatMoney(sellingPrice), inline: true },
                { name: 'Result', value: profitText, inline: true },
                { name: 'Current Balance', value: formatMoney(player.cash), inline: false }
            )
            .setColor(profit >= 0 ? '#2ecc71' : '#e74c3c')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handlePortfolio(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        if (!player.properties || player.properties.length === 0) {
            return await interaction.editReply('You don\'t own any properties yet.');
        }
        
        // Paginate property list
        const itemsPerPage = 5;
        const pages = Math.ceil(player.properties.length / itemsPerPage);
        let currentPage = 0;
        
        // Function to generate embed for a page
        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = Math.min(start + itemsPerPage, player.properties.length);
            const currentProperties = player.properties.slice(start, end);
            
            const embed = new EmbedBuilder()
                .setTitle(`🏘️ ${interaction.user.username}'s Property Portfolio`)
                .setDescription(`Total properties: ${player.properties.length} | Page ${page + 1}/${pages}`)
                .setColor('#3498db')
                .setFooter({ text: `Balance: ${formatMoney(player.cash)}` })
                .setTimestamp();
            
            let totalValue = 0;
            let totalIncome = 0;
            
            for (const prop of currentProperties) {
                const fullProperty = getProperty(prop.propertyId);
                if (fullProperty) {
                    const marketMultiplier = getMarketMultiplier();
                    const levelMultiplier = 1 + ((prop.level - 1) * 0.2);
                    const currentValue = Math.round(fullProperty.price * marketMultiplier * levelMultiplier);
                    totalValue += currentValue;
                    
                    const rentIncome = prop.rented ? fullProperty.rent_income * prop.level : 0;
                    totalIncome += rentIncome;
                    
                    let status = prop.rented ? "🟢 Currently rented" : "🔴 Not rented";
                    let profit = currentValue - prop.boughtPrice;
                    let profitPercent = Math.round(profit / prop.boughtPrice * 100);
                    let profitText = profit >= 0 ? 
                        `+${formatMoney(profit)} (+${profitPercent}%)` : 
                        `-${formatMoney(Math.abs(profit))} (-${Math.abs(profitPercent)}%)`;
                    
                    embed.addFields({
                        name: `${fullProperty.name} (Level ${prop.level}/${fullProperty.max_level})`,
                        value: [
                            `💰 Purchase price: ${formatMoney(prop.boughtPrice)}`,
                            `💵 Current value: ${formatMoney(currentValue)}`,
                            `📈 Profit/Loss: ${profitText}`,
                            `💸 Rental income: ${formatMoney(rentIncome)}/day`,
                            `📊 Status: ${status}`
                        ].join('\n'),
                        inline: false
                    });
                }
            }
            
            embed.addFields(
                { name: 'Total Property Value', value: formatMoney(totalValue), inline: true },
                { name: 'Total Income/Day', value: formatMoney(totalIncome), inline: true }
            );
            
            return embed;
        };
        
        const embed = generateEmbed(currentPage);
        
        // Create navigation buttons
        const createButtons = (page) => {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === pages - 1)
                );
            return row;
        };
        
        const message = await interaction.editReply({
            embeds: [embed],
            components: pages > 1 ? [createButtons(currentPage)] : []
        });
        
        // If only one page, no need for collector
        if (pages <= 1) return;
        
        // Create collector for button interactions
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000 // 1 minute timeout
        });
        
        collector.on('collect', async i => {
            if (i.customId === 'previous') {
                currentPage--;
            } else if (i.customId === 'next') {
                currentPage++;
            }
            
            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [createButtons(currentPage)]
            });
        });
        
        collector.on('end', async () => {
            // Disable buttons when collector expires
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
            
            await interaction.editReply({
                embeds: [generateEmbed(currentPage)],
                components: [disabledRow]
            }).catch(() => {});
        });
    },

    async handleUpgrade(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const propertyQuery = interaction.options.getString('property-name');
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        // Check if player has any properties
        if (!player.properties || player.properties.length === 0) {
            return await interaction.editReply('You don\'t own any properties yet.');
        }
        
        // Find property in player's portfolio
        const playerPropertyIndex = player.properties.findIndex(p => {
            const fullProperty = getProperty(p.propertyId);
            return p.propertyId === propertyQuery || 
                  (fullProperty && fullProperty.name.toLowerCase().includes(propertyQuery.toLowerCase()));
        });
        
        if (playerPropertyIndex === -1) {
            return await interaction.editReply(`You don't own a property with name or ID "${propertyQuery}".`);
        }
        
        const playerProperty = player.properties[playerPropertyIndex];
        const property = getProperty(playerProperty.propertyId);
        
        if (!property) {
            return await interaction.editReply('Property information not found. Please contact an administrator.');
        }
        
        // Check if property can be upgraded
        if (playerProperty.level >= property.max_level) {
            return await interaction.editReply(`"${property.name}" has already reached its maximum level (${property.max_level}).`);
        }
        
        // Calculate upgrade cost (increases with level)
        const upgradeCost = Math.round(property.upgrade_cost * (1 + (playerProperty.level - 1) * 0.5));
        
        // Check if player has enough money
        if (player.cash < upgradeCost) {
            return await interaction.editReply(`You don't have enough money to upgrade "${property.name}". Cost: ${formatMoney(upgradeCost)}, Your balance: ${formatMoney(player.cash)}`);
        }
        
        // Calculate new values
        const oldLevel = playerProperty.level;
        const oldRentIncome = property.rent_income * oldLevel;
        
        // Process upgrade
        player.cash -= upgradeCost;
        player.properties[playerPropertyIndex].level++;
        
        const newLevel = player.properties[playerPropertyIndex].level;
        const newRentIncome = property.rent_income * newLevel;
        
        // Save player data
        savePlayer(player);
        
        const embed = new EmbedBuilder()
            .setTitle('🏗️ Property Upgrade Successful!')
            .setDescription(`You upgraded "${property.name}" to level ${newLevel}/${property.max_level}`)
            .addFields(
                { name: 'Upgrade Cost', value: formatMoney(upgradeCost), inline: true },
                { name: 'Remaining Balance', value: formatMoney(player.cash), inline: true },
                { name: 'Previous Rental Income', value: formatMoney(oldRentIncome), inline: true },
                { name: 'New Rental Income', value: formatMoney(newRentIncome), inline: true },
                { name: 'Increase', value: `+${Math.round((newRentIncome - oldRentIncome) / oldRentIncome * 100)}%`, inline: true }
            )
            .setColor('#9b59b6')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handleRent(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const propertyQuery = interaction.options.getString('property-name');
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        // Check if player has any properties
        if (!player.properties || player.properties.length === 0) {
            return await interaction.editReply('You don\'t own any properties yet.');
        }
        
        // Find property in player's portfolio
        const playerPropertyIndex = player.properties.findIndex(p => {
            const fullProperty = getProperty(p.propertyId);
            return p.propertyId === propertyQuery || 
                  (fullProperty && fullProperty.name.toLowerCase().includes(propertyQuery.toLowerCase()));
        });
        
        if (playerPropertyIndex === -1) {
            return await interaction.editReply(`You don't own a property with name or ID "${propertyQuery}".`);
        }
        
        const playerProperty = player.properties[playerPropertyIndex];
        const property = getProperty(playerProperty.propertyId);
        
        if (!property) {
            return await interaction.editReply('Property information not found. Please contact an administrator.');
        }
        
        // Toggle rental status
        const newRentStatus = !playerProperty.rented;
        player.properties[playerPropertyIndex].rented = newRentStatus;
        
        // Save player data
        savePlayer(player);
        
        const rentIncome = property.rent_income * playerProperty.level;
        
        const embed = new EmbedBuilder()
            .setTitle(newRentStatus ? '🏠 Property Rented Successfully!' : '🏠 Property Rental Canceled!')
            .setDescription(newRentStatus ? 
                `You have rented out "${property.name}" for an income of ${formatMoney(rentIncome)}/day` : 
                `You have canceled the rental of "${property.name}"`)
            .addFields(
                { name: 'Property Level', value: `${playerProperty.level}/${property.max_level}`, inline: true },
                { name: 'Rental Income', value: newRentStatus ? formatMoney(rentIncome) + '/day' : '0 VNĐ/day', inline: true },
                { name: 'Status', value: newRentStatus ? '🟢 Currently rented' : '🔴 Not rented', inline: true }
            )
            .setColor(newRentStatus ? '#2ecc71' : '#e74c3c')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handleMarket(interaction) {
        await interaction.deferReply();
        
        // Get property list
        const properties = readJSONFile(PROPERTIES_PATH);
        
        if (!properties || properties.length === 0) {
            return await interaction.editReply('No properties available on the market.');
        }
        
        // Get market multiplier
        const marketData = readJSONFile(MARKET_PATH);
        const marketMultiplier = marketData.marketMultiplier || 1.0;
        
        // Paginate property list
        const itemsPerPage = 5;
        const pages = Math.ceil(properties.length / itemsPerPage);
        let currentPage = 0;
        
        // Function to generate embed for a page
        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = Math.min(start + itemsPerPage, properties.length);
            const currentProperties = properties.slice(start, end);
            
            let marketTrend = '';
            if (marketMultiplier > 1.1) marketTrend = '📈 STRONG BULL MARKET';
            else if (marketMultiplier > 1.0) marketTrend = '📈 SLIGHT MARKET INCREASE';
            else if (marketMultiplier === 1.0) marketTrend = '➡️ STABLE MARKET';
            else if (marketMultiplier >= 0.9) marketTrend = '📉 SLIGHT MARKET DECLINE';
            else marketTrend = '📉 MARKET CRASH';
            
            const embed = new EmbedBuilder()
                .setTitle('🏙️ Real Estate Market')
                .setDescription(`Current market condition: ${marketTrend} (×${marketMultiplier.toFixed(2)})`)
                .setColor(marketMultiplier >= 1.0 ? '#2ecc71' : '#e74c3c')
                .setFooter({ text: `Page ${page + 1}/${pages} • Last updated: ${new Date(marketData.lastUpdate || Date.now()).toLocaleString()}` })
                .setTimestamp();
            
            for (const property of currentProperties) {
                const currentPrice = Math.round(property.price * marketMultiplier);
                const rentIncome = property.rent_income;
                const roi = ((rentIncome * 365) / currentPrice * 100).toFixed(2);
                
                embed.addFields({
                    name: `${property.name} (${property.type})`,
                    value: [
                        `💰 Price: ${formatMoney(currentPrice)}`,
                        `💸 Rental Income: ${formatMoney(rentIncome)}/day`,
                        `📊 Annual ROI: ${roi}%`,
                        `⬆️ Max Level: ${property.max_level}`,
                        `🔨 Upgrade Cost: ${formatMoney(property.upgrade_cost)}`
                    ].join('\n'),
                    inline: false
                });
            }
            
            return embed;
        };
        
        const embed = generateEmbed(currentPage);
        
        // Create navigation buttons
        const createButtons = (page) => {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === pages - 1)
                );
            return row;
        };
        
        const message = await interaction.editReply({
            embeds: [embed],
            components: pages > 1 ? [createButtons(currentPage)] : []
        });
        
        // If only one page, no need for collector
        if (pages <= 1) return;
        
        // Create collector for button interactions
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000 // 1 minute timeout
        });
        
        collector.on('collect', async i => {
            if (i.customId === 'previous') {
                currentPage--;
            } else if (i.customId === 'next') {
                currentPage++;
            }
            
            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [createButtons(currentPage)]
            });
        });
        
        collector.on('end', async () => {
            // Disable buttons when collector expires
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
            
            await interaction.editReply({
                embeds: [generateEmbed(currentPage)],
                components: [disabledRow]
            }).catch(() => {});
        });
    },

    async handleAuction(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const propertyQuery = interaction.options.getString('property-name');
        const bidAmount = interaction.options.getInteger('bid');
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        // Check if bid amount is valid
        if (bidAmount <= 0) {
            return await interaction.editReply('Bid amount must be greater than zero.');
        }
        
        // Check if player has enough money
        if (player.cash < bidAmount) {
            return await interaction.editReply(`You don't have enough money to place this bid. Your balance: ${formatMoney(player.cash)}`);
        }
        
        // Get property list
        const properties = readJSONFile(PROPERTIES_PATH);
        
        // Find property by ID or name
        const property = properties.find(
            p => p.id === propertyQuery || 
            p.name.toLowerCase().includes(propertyQuery.toLowerCase())
        );
        
        if (!property) {
            return await interaction.editReply(`Property with name or ID "${propertyQuery}" not found.`);
        }
        
        // Get market data and check if auctions exist
        const marketData = readJSONFile(MARKET_PATH);
        if (!marketData.auctions) marketData.auctions = [];
        
        // Find existing auction for this property
        let auction = marketData.auctions.find(a => a.propertyId === property.id);
        
        if (!auction) {
            // Create new auction
            const minimumBid = Math.round(property.price * 0.7); // Start at 70% of market value
            
            if (bidAmount < minimumBid) {
                return await interaction.editReply(`Minimum bid for this property is ${formatMoney(minimumBid)}.`);
            }
            
            auction = {
                propertyId: property.id,
                highestBid: bidAmount,
                highestBidder: userId,
                bidderName: interaction.user.username,
                startTime: Date.now(),
                endTime: Date.now() + 86400000, // 24 hours
                bids: [{
                    userId: userId,
                    username: interaction.user.username, 
                    amount: bidAmount,
                    time: Date.now()
                }]
            };
            
            marketData.auctions.push(auction);
        } else {
            // Check if auction is still active
            if (auction.endTime <= Date.now()) {
                return await interaction.editReply(`This auction has ended. The winner was ${auction.bidderName} with a bid of ${formatMoney(auction.highestBid)}.`);
            }
            
            // Check if bid is higher than current highest
            if (bidAmount <= auction.highestBid) {
                return await interaction.editReply(`Your bid must be higher than the current highest bid of ${formatMoney(auction.highestBid)}.`);
            }
            
            // Update auction
            auction.highestBid = bidAmount;
            auction.highestBidder = userId;
            auction.bidderName = interaction.user.username;
            auction.bids.push({
                userId: userId,
                username: interaction.user.username,
                amount: bidAmount,
                time: Date.now()
            });
            
            // Extend auction time if bid is within the last hour
            const timeLeft = auction.endTime - Date.now();
            if (timeLeft < 3600000) { // less than 1 hour
                auction.endTime = Date.now() + 3600000; // extend by 1 hour from now
            }
        }
        
        // Save market data
        writeJSONFile(MARKET_PATH, marketData);
        
        // Format time remaining
        const timeRemaining = new Date(auction.endTime - Date.now());
        const hours = timeRemaining.getUTCHours();
        const minutes = timeRemaining.getUTCMinutes();
        const seconds = timeRemaining.getUTCSeconds();
        const timeRemainingText = `${hours}h ${minutes}m ${seconds}s`;
        
        const embed = new EmbedBuilder()
            .setTitle('🔨 Auction Bid Placed!')
            .setDescription(`You have placed a bid on "${property.name}"`)
            .addFields(
                { name: 'Your Bid', value: formatMoney(bidAmount), inline: true },
                { name: 'Current Highest Bid', value: formatMoney(auction.highestBid), inline: true },
                { name: 'Current Highest Bidder', value: auction.bidderName, inline: true },
                { name: 'Time Remaining', value: timeRemainingText, inline: true },
                { name: 'Total Bids', value: `${auction.bids.length}`, inline: true }
            )
            .setColor('#f39c12')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handleRichList(interaction) {
        await interaction.deferReply();
        
        // Get all players
        const players = readJSONFile(PLAYERS_PATH);
        
        if (!players || players.length === 0) {
            return await interaction.editReply('No players registered yet.');
        }
        
        // Calculate net worth for each player
        const marketMultiplier = getMarketMultiplier();
        const playersWithNetWorth = players.map(player => {
            let propertyValue = 0;
            
            if (player.properties && player.properties.length > 0) {
                for (const prop of player.properties) {
                    const property = getProperty(prop.propertyId);
                    if (property) {
                        const levelMultiplier = 1 + ((prop.level - 1) * 0.2);
                        propertyValue += Math.round(property.price * marketMultiplier * levelMultiplier);
                    }
                }
            }
            
            const netWorth = player.cash + propertyValue + (player.bankSavings || 0) - (player.loan || 0);
            
            return {
                userId: player.userId,
                username: player.username,
                cash: player.cash,
                propertyValue: propertyValue,
                bankSavings: player.bankSavings || 0,
                loan: player.loan || 0,
                netWorth: netWorth,
                propertyCount: player.properties ? player.properties.length : 0
            };
        });
        
        // Sort by net worth, descending
        playersWithNetWorth.sort((a, b) => b.netWorth - a.netWorth);
        
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle('💰 Real Estate Tycoon Leaderboard')
            .setDescription('Top players by net worth')
            .setColor('#f1c40f')
            .setTimestamp();
        
        // Add top 10 players
        const topPlayers = playersWithNetWorth.slice(0, 10);
        for (let i = 0; i < topPlayers.length; i++) {
            const player = topPlayers[i];
            embed.addFields({
                name: `#${i + 1}: ${player.username}`,
                value: [
                    `💵 Net Worth: ${formatMoney(player.netWorth)}`,
                    `💰 Cash: ${formatMoney(player.cash)}`,
                    `🏠 Property Value: ${formatMoney(player.propertyValue)} (${player.propertyCount} properties)`,
                    `🏦 Bank Savings: ${formatMoney(player.bankSavings)}`,
                    `💳 Loan: ${formatMoney(player.loan)}`
                ].join('\n'),
                inline: false
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handleDaily(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        // Check if daily mission is already completed today
        const lastDaily = player.lastDailyMission ? new Date(player.lastDailyMission) : null;
        const now = new Date();
        
        if (lastDaily && 
            lastDaily.getDate() === now.getDate() && 
            lastDaily.getMonth() === now.getMonth() && 
            lastDaily.getFullYear() === now.getFullYear()) {
            return await interaction.editReply('You have already completed your daily mission today. Please come back tomorrow!');
        }
        
        // Generate rental income from properties
        let totalRentalIncome = 0;
        if (player.properties && player.properties.length > 0) {
            for (const prop of player.properties) {
                if (prop.rented) {
                    const property = getProperty(prop.propertyId);
                    if (property) {
                        const rentIncome = property.rent_income * prop.level;
                        totalRentalIncome += rentIncome;
                    }
                }
            }
        }
        
        // Generate a random mission
        const missionTypes = [
            { type: 'upgrade', reward: 50000, description: 'Upgrade one of your properties' },
            { type: 'buy', reward: 100000, description: 'Buy a new property' },
            { type: 'rent', reward: 75000, description: 'Rent out a property' }
        ];
        
        const mission = missionTypes[Math.floor(Math.random() * missionTypes.length)];
        
        // Apply rental income
        player.cash += totalRentalIncome;
        
        // Update last daily mission timestamp
        player.lastDailyMission = now.toISOString();
        
        // Save mission info
        if (!player.currentMission) player.currentMission = mission;
        
        // Save player data
        savePlayer(player);
        
        const embed = new EmbedBuilder()
            .setTitle('📅 Daily Check-In')
            .setDescription('Welcome back to your real estate empire!')
            .addFields(
                { name: '💸 Rental Income Collected', value: formatMoney(totalRentalIncome), inline: false },
                { name: '📊 Current Balance', value: formatMoney(player.cash), inline: false },
                { name: '🎯 Daily Mission', value: `${mission.description} to earn ${formatMoney(mission.reward)}`, inline: false }
            )
            .setColor('#3498db')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handleGift(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const targetUser = interaction.options.getUser('player');
        const amount = interaction.options.getInteger('amount');
        
        if (!targetUser) {
            return await interaction.editReply('You need to specify a valid user to gift money to.');
        }
        
        if (targetUser.id === userId) {
            return await interaction.editReply('You cannot gift money to yourself.');
        }
        
        if (amount <= 0) {
            return await interaction.editReply('Gift amount must be greater than zero.');
        }
        
        // Get player information
        const player = getPlayer(userId);
        if (!player) {
            return await interaction.editReply('You need to register first. Please use `/realestate register` to create an account.');
        }
        
        // Check if player has enough money
        if (player.cash < amount) {
            return await interaction.editReply(`You don't have enough money. Your balance: ${formatMoney(player.cash)}`);
        }
        
        // Get target player information
        let targetPlayer = getPlayer(targetUser.id);
        if (!targetPlayer) {
            // Create new account for target player
            targetPlayer = {
                userId: targetUser.id,
                username: targetUser.username,
                password: "defaultpassword", // Should be changed by the player
                cash: 1000000 + amount, // Starting cash + gift
                properties: [],
                loan: 0,
                bankSavings: 0,
                lastDailyMission: null
            };
        } else {
            // Add gift to target player's cash
            targetPlayer.cash += amount;
        }
        
        // Remove gift from player's cash
        player.cash -= amount;
        
        // Save player data
        savePlayer(player);
        savePlayer(targetPlayer);
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 Gift Sent Successfully!')
            .setDescription(`You sent ${formatMoney(amount)} to ${targetUser.username}`)
            .addFields(
                { name: 'Your New Balance', value: formatMoney(player.cash), inline: true },
                { name: 'Recipient Balance', value: formatMoney(targetPlayer.cash), inline: true }
            )
            .setColor('#2ecc71')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },

    async handleServerStats(interaction) {
        await interaction.deferReply();
        
        // Get all players
        const players = readJSONFile(PLAYERS_PATH);
        
        if (!players || players.length === 0) {
            return await interaction.editReply('No players registered yet.');
        }
        
        // Calculate stats
        let totalPlayers = players.length;
        let totalCash = 0;
        let totalPropertyValue = 0;
        let totalProperties = 0;
        let totalRentedProperties = 0;
        let totalLoans = 0;
        let totalSavings = 0;
        
        const marketMultiplier = getMarketMultiplier();
        
        for (const player of players) {
            totalCash += player.cash;
            totalLoans += player.loan || 0;
            totalSavings += player.bankSavings || 0;
            
            if (player.properties && player.properties.length > 0) {
                totalProperties += player.properties.length;
                
                for (const prop of player.properties) {
                    const property = getProperty(prop.propertyId);
                    if (property) {
                        const levelMultiplier = 1 + ((prop.level - 1) * 0.2);
                        totalPropertyValue += Math.round(property.price * marketMultiplier * levelMultiplier);
                    }
                    
                    if (prop.rented) {
                        totalRentedProperties++;
                    }
                }
            }
        }
        
        // Calculate total economy and averages
        const totalEconomy = totalCash + totalPropertyValue + totalSavings - totalLoans;
        const averageWealth = Math.round(totalEconomy / totalPlayers);
        const propertyPercentage = totalProperties > 0 ? Math.round((totalRentedProperties / totalProperties) * 100) : 0;
        
        const embed = new EmbedBuilder()
            .setTitle('📊 YURI BAT DONG SAN')
            .setDescription('Thống Kê nền kinh tế sever')
            .addFields(
                { name: 'Số lượng người chơi', value: `${totalPlayers}`, inline: true },
                { name: 'Tổng số Tiền', value: formatMoney(totalEconomy), inline: true },
                { name: 'Lương Trung bình', value: formatMoney(averageWealth), inline: true },
                { name: 'Total Cash in Circulation', value: formatMoney(totalCash), inline: true },
                { name: 'Total Property Value', value: formatMoney(totalPropertyValue), inline: true },
                { name: 'Properties Count', value: `${totalProperties} (${totalRentedProperties} rented, ${propertyPercentage}%)`, inline: true },
                { name: 'Total Bank Savings', value: formatMoney(totalSavings), inline: true },
                { name: 'Total Outstanding Loans', value: formatMoney(totalLoans), inline: true },
                { name: 'Market Multiplier', value: `×${marketMultiplier.toFixed(2)}`, inline: true }
            )
            .setColor('#34495e')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
};
