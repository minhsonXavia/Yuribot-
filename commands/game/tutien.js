const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// File paths
const PLAYER_DATA_PATH = path.join(__dirname, '../data/tutien.json');
const ITEMS_DATA_PATH = path.join(__dirname, '../data/items.json');
const MISSIONS_DATA_PATH = path.join(__dirname, '../data/missions.json');
const SETTINGS_DATA_PATH = path.join(__dirname, '../data/settings.json');
const EVENTS_DATA_PATH = path.join(__dirname, '../data/events.json');

// Ensure data files exist
function ensureDataFilesExist() {
    const dataFiles = [
        { path: PLAYER_DATA_PATH, defaultContent: {} },
        { path: ITEMS_DATA_PATH, defaultContent: {} },
        { path: MISSIONS_DATA_PATH, defaultContent: {} },
        { path: SETTINGS_DATA_PATH, defaultContent: {} },
        { path: EVENTS_DATA_PATH, defaultContent: {} }
    ];

    dataFiles.forEach(file => {
        try {
            if (!fs.existsSync(file.path)) {
                // Create directory if it doesn't exist
                const dir = path.dirname(file.path);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // Create file with default content
                fs.writeFileSync(file.path, JSON.stringify(file.defaultContent, null, 2));
                console.log(`Created data file: ${file.path}`);
            }
        } catch (error) {
            console.error(`Error ensuring data file exists: ${file.path}`, error);
        }
    });
}

// Load data
function loadData(filePath, defaultValue = {}) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return defaultValue;
    } catch (error) {
        console.error(`Error loading data from ${filePath}:`, error);
        return defaultValue;
    }
}

// Save data
function saveData(filePath, data) {
    try {
        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error saving data to ${filePath}:`, error);
        return false;
    }
}

// Get player data
function getPlayerData(userId) {
    const playerData = loadData(PLAYER_DATA_PATH);
    return playerData[userId] || null;
}

// Create new player
function createNewPlayer(userId, username) {
    const playerData = loadData(PLAYER_DATA_PATH);
    const settings = loadData(SETTINGS_DATA_PATH);
    
    const newPlayer = {
        id: userId,
        name: username,
        stage: 0, // Index of the cultivation stage
        stageName: settings.cultivationStages[0].name,
        exp: 0,
        stones: 100, // Starting currency
        power: 10,
        spirit: 10,
        speed: 1.0,
        weapons: [],
        artifacts: [],
        skills: [],
        completedMissions: [],
        cooldowns: {
            cultivation: 0,
            missions: 0,
            battle: 0,
            event: 0
        },
        lastLogin: Date.now(),
        stats: {
            cultivationTimes: 0,
            breakthroughSuccesses: 0,
            breakthroughFailures: 0,
            monstersDefeated: 0,
            bossesDefeated: 0,
            missionsCompleted: 0,
            itemsPurchased: 0
        }
    };
    
    playerData[userId] = newPlayer;
    saveData(PLAYER_DATA_PATH, playerData);
    
    return newPlayer;
}

// Save player data
function savePlayerData(player) {
    const playerData = loadData(PLAYER_DATA_PATH);
    playerData[player.id] = player;
    return saveData(PLAYER_DATA_PATH, playerData);
}

// Get cultivation stage details
function getCultivationStage(index) {
    const settings = loadData(SETTINGS_DATA_PATH);
    if (index >= 0 && index < settings.cultivationStages.length) {
        return settings.cultivationStages[index];
    }
    return null;
}

// Calculate cultivation gains
function calculateCultivationGains(player) {
    const stage = getCultivationStage(player.stage);
    
    // Base gain based on cultivation stage
    let expGain = 10 * stage.expMultiplier;
    
    // Bonus from artifacts
    const artifactsBonus = player.artifacts.reduce((bonus, artifactId) => {
        const items = loadData(ITEMS_DATA_PATH);
        const artifact = items.artifacts.find(a => a.id === artifactId);
        if (artifact && artifact.effect === 'exp_boost') {
            return bonus + artifact.value;
        }
        return bonus;
    }, 0);
    
    // Apply spirit stat influence (1% per point)
    const spiritMultiplier = 1 + (player.spirit * 0.01);
    
    // Apply speed multiplier
    const speedMultiplier = player.speed;
    
    // Calculate final gain
    const totalGain = Math.floor(expGain * (1 + artifactsBonus/100) * spiritMultiplier * speedMultiplier);
    
    return totalGain;
}

// Check if player can breakthrough
function canBreakthrough(player) {
    const currentStage = getCultivationStage(player.stage);
    const settings = loadData(SETTINGS_DATA_PATH);
    
    // Check if this is the highest stage
    if (player.stage >= settings.cultivationStages.length - 1) {
        return {
            canBreak: false,
            reason: "Bạn đã đạt tới cảnh giới cao nhất!"
        };
    }
    
    // Check if player has enough exp
    if (player.exp < currentStage.expToNext) {
        return {
            canBreak: false,
            reason: `Bạn cần thêm ${currentStage.expToNext - player.exp} tu vi để đột phá`
        };
    }
    
    return {
        canBreak: true
    };
}

// Perform breakthrough attempt
function attemptBreakthrough(player) {
    const settings = loadData(SETTINGS_DATA_PATH);
    const { breakthroughChance } = settings;
    
    // Check if player has breakthrough pill
    const hasBreakthroughPill = player.items && player.items.includes("dot-pha-dan");
    
    // Calculate success chance
    let successChance = breakthroughChance.base;
    if (hasBreakthroughPill) {
        successChance += breakthroughChance.itemBonus;
        // Remove the pill after use
        player.items = player.items.filter(item => item !== "dot-pha-dan");
    }
    
    // Random roll
    const roll = Math.random() * 100;
    
    if (roll <= successChance) {
        // Success
        player.stage += 1;
        player.stageName = settings.cultivationStages[player.stage].name;
        player.exp = 0;
        player.power += 20;
        player.spirit += 10;
        player.stats.breakthroughSuccesses += 1;
        
        return {
            success: true,
            newStage: player.stageName,
            message: `🎉 Chúc mừng! Bạn đã đột phá thành công lên cảnh giới ${player.stageName}!`
        };
    } else {
        // Failure
        const expLoss = Math.floor(player.exp * (breakthroughChance.failPenalty / 100));
        player.exp -= expLoss;
        if (player.exp < 0) player.exp = 0;
        player.stats.breakthroughFailures += 1;
        
        return {
            success: false,
            expLost: expLoss,
            message: `❌ Đột phá thất bại! Bạn bị tổn thương đạo tâm và mất ${expLoss} tu vi.`
        };
    }
}

// Get available missions for player
function getAvailableMissions(player) {
    const missions = loadData(MISSIONS_DATA_PATH);
    const dailyMissions = missions.daily.filter(mission => 
        !player.completedMissions.some(cm => cm.id === mission.id && Date.now() - cm.timestamp < 86400000)
    );
    
    const specialMissions = missions.special.filter(mission => 
        !player.completedMissions.some(cm => cm.id === mission.id)
    );
    
    return { dailyMissions, specialMissions };
}

// Complete a mission
function completeMission(player, missionId) {
    const missions = loadData(MISSIONS_DATA_PATH);
    
    // Find the mission
    let mission = missions.daily.find(m => m.id === missionId);
    if (!mission) {
        mission = missions.special.find(m => m.id === missionId);
    }
    
    if (!mission) {
        return {
            success: false,
            message: "Không tìm thấy nhiệm vụ này."
        };
    }
    
    // Apply rewards
    player.exp += mission.reward.exp;
    player.stones += mission.reward.stones;
    
    // If mission provides an item
    if (mission.reward.item) {
        if (!player.items) player.items = [];
        player.items.push(mission.reward.item);
    }
    
    // Record completion
    if (!player.completedMissions) player.completedMissions = [];
    player.completedMissions.push({
        id: mission.id,
        timestamp: Date.now()
    });
    
    player.stats.missionsCompleted += 1;
    player.cooldowns.missions = Date.now();
    
    return {
        success: true,
        mission: mission,
        message: `✅ Đã hoàn thành nhiệm vụ: ${mission.name}`
    };
}

// Battle system
function battle(player, enemyId) {
    const settings = loadData(SETTINGS_DATA_PATH);
    
    // Find enemy
    let enemy = settings.monsters.find(m => m.id === enemyId);
    if (!enemy) {
        enemy = settings.bosses.find(b => b.id === enemyId);
    }
    
    if (!enemy) {
        return {
            success: false,
            message: "Không tìm thấy đối thủ này."
        };
    }
    
    // Check if player meets minimum stage requirement
    if (player.stage < enemy.minStage) {
        return {
            success: false,
            message: `Cảnh giới tu luyện của bạn chưa đủ để đấu với ${enemy.name}.`
        };
    }
    
    // Calculate player battle stats
    let playerPower = player.power;
    
    // Add weapon bonus
    player.weapons.forEach(weaponId => {
        const items = loadData(ITEMS_DATA_PATH);
        const weapon = items.weapons.find(w => w.id === weaponId);
        if (weapon) {
            playerPower += weapon.power;
        }
    });
    
    // Add artifact bonus
    player.artifacts.forEach(artifactId => {
        const items = loadData(ITEMS_DATA_PATH);
        const artifact = items.artifacts.find(a => a.id === artifactId);
        if (artifact && artifact.effect === 'damage_boost') {
            playerPower += artifact.value;
        }
    });
    
    // Battle simulation
    let enemyHealth = enemy.health;
    let playerHealth = player.power * 10; // Player health based on power
    let rounds = 0;
    let battleLog = [];
    
    while (enemyHealth > 0 && playerHealth > 0 && rounds < 10) {
        rounds++;
        
        // Player attacks
        const playerDamage = Math.floor(playerPower * (0.8 + Math.random() * 0.4));
        enemyHealth -= playerDamage;
        battleLog.push(`[Hiệp ${rounds}] Bạn tấn công ${enemy.name} gây ${playerDamage} sát thương!`);
        
        if (enemyHealth <= 0) {
            battleLog.push(`[Hiệp ${rounds}] Bạn đã đánh bại ${enemy.name}!`);
            break;
        }
        
        // Enemy attacks
        const enemyDamage = Math.floor(enemy.power * (0.8 + Math.random() * 0.4));
        playerHealth -= enemyDamage;
        battleLog.push(`[Hiệp ${rounds}] ${enemy.name} tấn công bạn gây ${enemyDamage} sát thương!`);
        
        if (playerHealth <= 0) {
            battleLog.push(`[Hiệp ${rounds}] Bạn đã bị đánh bại bởi ${enemy.name}!`);
            break;
        }
    }
    
    // Battle outcome
    if (enemyHealth <= 0) {
        // Player wins
        player.exp += enemy.reward.exp;
        player.stones += enemy.reward.stones;
        
        // If enemy drops an item
        if (enemy.reward.item) {
            const items = loadData(ITEMS_DATA_PATH);
            let rewardItem;
            
            if (enemy.reward.item === 'random') {
                // Select random item
                const itemArrays = [items.weapons, items.artifacts, items.consumables];
                const selectedArray = itemArrays[Math.floor(Math.random() * itemArrays.length)];
                rewardItem = selectedArray[Math.floor(Math.random() * selectedArray.length)];
            } else if (enemy.reward.item === 'rare') {
                // Select rare item (just picking the most expensive for simplicity)
                const allItems = [...items.weapons, ...items.artifacts, ...items.consumables];
                allItems.sort((a, b) => b.price - a.price);
                rewardItem = allItems[0];
            } else {
                // Find specific item
                rewardItem = [...items.weapons, ...items.artifacts, ...items.consumables]
                    .find(item => item.id === enemy.reward.item);
            }
            
            if (rewardItem) {
                if (!player.items) player.items = [];
                player.items.push(rewardItem.id);
                battleLog.push(`🎁 Bạn nhận được vật phẩm: ${rewardItem.name}!`);
            }
        }
        
        // Update stats
        if (settings.bosses.some(b => b.id === enemyId)) {
            player.stats.bossesDefeated += 1;
        } else {
            player.stats.monstersDefeated += 1;
        }
        
        player.cooldowns.battle = Date.now();
        
        return {
            success: true,
            victory: true,
            enemy: enemy,
            log: battleLog,
            rewards: {
                exp: enemy.reward.exp,
                stones: enemy.reward.stones
            }
        };
    } else {
        // Player loses
        const expLoss = Math.floor(player.exp * 0.05); // Lose 5% exp on defeat
        player.exp -= expLoss;
        if (player.exp < 0) player.exp = 0;
        
        player.cooldowns.battle = Date.now();
        
        return {
            success: true,
            victory: false,
            enemy: enemy,
            log: battleLog,
            losses: {
                exp: expLoss
            }
        };
    }
}


// Shop system
function getShopItems() {
    return loadData(ITEMS_DATA_PATH);
}

// Purchase item
function purchaseItem(player, itemId) {
    const items = loadData(ITEMS_DATA_PATH);
    
    // Find the item
    let item;
    let category;
    
    if (items.weapons.some(w => w.id === itemId)) {
        item = items.weapons.find(w => w.id === itemId);
        category = 'weapons';
    } else if (items.artifacts.some(a => a.id === itemId)) {
        item = items.artifacts.find(a => a.id === itemId);
        category = 'artifacts';
    } else if (items.consumables.some(c => c.id === itemId)) {
        item = items.consumables.find(c => c.id === itemId);
        category = 'items';
    }
    
    if (!item) {
        return {
            success: false,
            message: "Không tìm thấy vật phẩm này."
        };
    }
    
    // Check if player has enough stones
    if (player.stones < item.price) {
        return {
            success: false,
            message: `Không đủ linh thạch! Cần ${item.price}, bạn có ${player.stones}.`
        };
    }
    
    // Purchase the item
    player.stones -= item.price;
    
    // Add to appropriate inventory
    if (category === 'weapons') {
        if (!player.weapons) player.weapons = [];
        player.weapons.push(itemId);
    } else if (category === 'artifacts') {
        if (!player.artifacts) player.artifacts = [];
        player.artifacts.push(itemId);
    } else if (category === 'items') {
        if (!player.items) player.items = [];
        player.items.push(itemId);
    }
    
    player.stats.itemsPurchased += 1;
    
    return {
        success: true,
        item: item,
        message: `✅ Đã mua ${item.name} với giá ${item.price} linh thạch.`
    };
}

// Event system
function triggerRandomEvent(player) {
    const events = loadData(EVENTS_DATA_PATH);
    
    // Check if an event should occur
    if (Math.random() * 100 > events.eventChance) {
        return null;
    }
    
    // Select random event
    const event = events.events[Math.floor(Math.random() * events.events.length)];
    
    return event;
}

// Process event choice
function processEventChoice(player, eventId, choiceIndex) {
    const events = loadData(EVENTS_DATA_PATH);
    const event = events.events.find(e => e.id === eventId);
    
    if (!event) {
        return {
            success: false,
            message: "Sự kiện không tồn tại."
        };
    }
    
    // If event has no choices
    if (!event.choices) {
        // Apply direct reward
        if (event.reward.exp) player.exp += event.reward.exp;
        if (event.reward.stones) player.stones += event.reward.stones;
        if (event.reward.cultivationBoost) player.speed += event.reward.cultivationBoost;
        
        return {
            success: true,
            event: event,
            message: `✨ Bạn đã nhận được phần thưởng từ sự kiện ${event.name}!`
        };
    }
    
    // Process choice
    if (choiceIndex < 0 || choiceIndex >= event.choices.length) {
        return {
            success: false,
            message: "Lựa chọn không hợp lệ."
        };
    }
    
    const choice = event.choices[choiceIndex];
    const reward = choice.reward;
    
    // Apply rewards based on type
    if (reward.exp) player.exp += reward.exp;
    if (reward.stones) player.stones += reward.stones;
    
    if (reward.type === 'skill') {
        // Add a random skill
        if (!player.skills) player.skills = [];
        const skillNames = ["Hỏa Diễm Quyết", "Thủy Linh Công", "Phong Lôi Thuật", "Ngũ Hành Quyết"];
        const newSkill = skillNames[Math.floor(Math.random() * skillNames.length)];
        player.skills.push(newSkill);
    } else if (reward.type === 'item') {
        // Add a random item
        if (!player.items) player.items = [];
        const items = loadData(ITEMS_DATA_PATH);
        const allItems = [...items.consumables];
        const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
        player.items.push(randomItem.id);
    } else if (reward.type === 'risky') {
        // 50% chance for double reward or lose
        if (Math.random() > 0.5) {
            if (reward.exp) player.exp += reward.exp; // Double exp
            if (reward.stones) player.stones += reward.stones; // Double stones
        } else {
            const expLoss = Math.floor(player.exp * 0.1); // Lose 10% exp
            player.exp -= expLoss;
            if (player.exp < 0) player.exp = 0;
            
            return {
                success: true,
                event: event,
                message: `❌ Rủi ro đã xảy ra! Bạn mất ${expLoss} tu vi.`
            };
        }
    }
    
    player.cooldowns.event = Date.now();
    
    return {
        success: true,
        event: event,
        choice: choice,
        message: `✨ Bạn đã chọn: "${choice.text}" và nhận được phần thưởng!`
    };
}

// Get player ranking
function getPlayerRanking() {
    const playerData = loadData(PLAYER_DATA_PATH);
    
    // Convert object to array
    const players = Object.values(playerData);
    
    // Sort by stage and exp
    players.sort((a, b) => {
        if (a.stage === b.stage) {
            return b.exp - a.exp;
        }
        return b.stage - a.stage;
    });
    
    return players.slice(0, 10); // Return top 10
}

// Create command
module.exports = {
    data: new SlashCommandBuilder()
        .setName('tutien')
        .setDescription('Hệ thống tu tiên')
        .addSubcommand(subcommand =>
            subcommand
                .setName('batdau')
                .setDescription('Bắt đầu hành trình tu tiên')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tu')
                .setDescription('Tu luyện để tăng tu vi')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('trangthai')
                .setDescription('Xem trạng thái của bản thân')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('dotpha')
                .setDescription('Đột phá lên cảnh giới cao hơn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('nhiemvu')
                .setDescription('Nhận nhiệm vụ hằng ngày')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID của nhiệm vụ để hoàn thành')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('chiendau')
                .setDescription('Chiến đấu với quái/boss')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID của quái vật/boss để chiến đấu')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Mua vật phẩm/pháp bảo')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID của vật phẩm để mua')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bangxephang')
                .setDescription('Xem top người chơi')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('su-kien')
                .setDescription('Tham gia sự kiện đặc biệt hoặc kỳ ngộ')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID của sự kiện')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('choice')
                        .setDescription('Lựa chọn của bạn (nếu có)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('phapbao')
                .setDescription('Xem thông tin pháp bảo đang sở hữu')
        ),
    
        async execute(interaction) {
            // Ensure data files exist
            ensureDataFilesExist();
            
            const userId = interaction.user.id;
            const username = interaction.user.username;
            const subcommand = interaction.options.getSubcommand();
            
            let player = getPlayerData(userId);
            const settings = loadData(SETTINGS_DATA_PATH);
            
        
        
        // Handle commands
        switch (subcommand) {
            case 'batdau': {
                // Check if player already exists
                if (player) {
                    return interaction.reply({
                        content: `Bạn đã bắt đầu hành trình tu tiên rồi! Cảnh giới hiện tại: ${player.stageName}.`,
                        ephemeral: true
                    });
                }
                
                // Create new player
                player = createNewPlayer(userId, username);
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🧘 Bắt Đầu Hành Trình Tu Tiên')
                    .setDescription('Bạn đã bắt đầu hành trình tu tiên đầy thử thách!')
                    .addFields(
                        { name: 'Cảnh Giới', value: player.stageName, inline: true },
                        { name: 'Tu Vi', value: `${player.exp}`, inline: true },
                        { name: 'Linh Thạch', value: `${player.stones}`, inline: true },
                        { name: '📜 Hướng Dẫn', value: 'Sử dụng `/tutien tu` để tu luyện tăng tu vi\nSử dụng `/tutien nhiemvu` để nhận nhiệm vụ\nSử dụng `/tutien shop` để mua pháp bảo' }
                    )
                    .setFooter({ text: 'Tu tiên - Hành trình đạo đạo' });
                
                return interaction.reply({ embeds: [embed] });
            }

            function calculateCultivationGains(player) {
                // Đảm bảo player tồn tại
                if (!player) {
                    console.error("Player is null in calculateCultivationGains");
                    return 50; // Giá trị mặc định nếu không có player
                }
            
                // Lấy stage người chơi với xử lý null
                const stage = getCultivationStage(player.stage);
                
                // Sử dụng expMultiplier với giá trị mặc định là 1 nếu không tồn tại
                const baseExp = 50; // Giá trị EXP cơ bản mỗi lần tu
                const expMultiplier = stage?.expMultiplier || 1;
                
                // Cập nhật các chỉ số khác
                if (!player.power) player.power = 0;
                if (!player.spirit) player.spirit = 0;
                if (!player.speed) player.speed = 0;
                
                // Tăng chỉ số
                player.power += 10;
                player.spirit += 10;
                player.speed += 1;
            
                // Trả về exp đã được nhân với hệ số
                return Math.floor(baseExp * expMultiplier);
            }
            case 'tu': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                // Get cultivation stage with default fallback
                const stage = getCultivationStage(player.stage);
                
                // Check cooldown
                const cooldownTime = (stage?.cooldown || 300) * 1000; // Use 300s (5 minutes) as default cooldown
                const timeRemaining = cooldownTime - (Date.now() - (player.cooldowns?.cultivation || 0));
                
                if (timeRemaining > 0) {
                    const minutes = Math.floor(timeRemaining / 60000);
                    const seconds = Math.floor((timeRemaining % 60000) / 1000);
                    return interaction.reply({
                        content: `Bạn đang trong thời gian hồi: ${minutes}m ${seconds}s. Hãy quay lại sau!`,
                        ephemeral: true
                    });
                }
                
                // Calculate exp gain
                const expGain = calculateCultivationGains(player);
                player.exp += expGain;
                
                // Initialize cooldowns if not exist
                if (!player.cooldowns) player.cooldowns = {};
                player.cooldowns.cultivation = Date.now();
                
                // Initialize stats if not exist
                if (!player.stats) player.stats = { cultivationTimes: 0 };
                player.stats.cultivationTimes += 1;
                
                // Check for random event
                const randomEvent = triggerRandomEvent(player);
                
                // Save player
                savePlayerData(player);
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🧘 Tu Luyện')
                    .setDescription(`Bạn đã tu luyện thành công và nhận được ${expGain} tu vi!`)
                    .addFields(
                        { name: 'Cảnh Giới', value: player.stageName || 'Phàm Nhân', inline: true },
                        { name: 'Tu Vi', value: `${player.exp}/${stage?.expToNext || 100}`, inline: true },
                        { name: 'Linh Thạch', value: `${player.stones || 0}`, inline: true },
                        { name: 'Chỉ số', value: `Sức Mạnh: ${player.power || 0} | Tâm Linh: ${player.spirit || 0} | Tốc Độ: ${player.speed || 0}`, inline: false }
                    )
                    .setFooter({ text: `Thời gian hồi: ${(stage?.cooldown || 300) / 60} phút` });
                
                if (randomEvent) {
                    embed.addFields(
                        { name: '✨ Kỳ Ngộ!', value: `${randomEvent.name}: ${randomEvent.description}` }
                    );
                    
                    if (randomEvent.choices && randomEvent.choices.length > 0) {
                        // Instead of buttons, list choices with A, B, C options
                        let choicesText = "Hãy reply với lựa chọn của bạn (A, B, C...):\n";
                        const choiceLabels = ['A', 'B', 'C', 'D', 'E'];
                        
                        randomEvent.choices.forEach((choice, index) => {
                            if (index < choiceLabels.length) {
                                choicesText += `**${choiceLabels[index]}**: ${choice.text}\n`;
                            }
                        });
                        
                        embed.addFields({ name: 'Lựa Chọn', value: choicesText });
                        
                        // Create a collector for message replies
                        interaction.reply({ embeds: [embed] }).then(() => {
                            const filter = m => m.author.id === interaction.user.id;
                            const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
                            
                            collector.on('collect', message => {
                                // Process the reply
                                const choiceText = message.content.trim().toUpperCase();
                                const choiceIndex = choiceLabels.indexOf(choiceText);
                                
                                if (choiceIndex >= 0 && choiceIndex < randomEvent.choices.length) {
                                    // Valid choice
                                    const result = processEventChoice(player, randomEvent.id, choiceIndex);
                                    
                                    if (result.success) {
                                        // Save player
                                        savePlayerData(player);
                                        
                                        const resultEmbed = new EmbedBuilder()
                                            .setColor('#00ff00')
                                            .setTitle(`✨ ${randomEvent.name}`)
                                            .setDescription(result.message);
                                        
                                        message.reply({ embeds: [resultEmbed] });
                                    } else {
                                        message.reply(`❌ ${result.message}`);
                                    }
                                } else {
                                    message.reply('❌ Lựa chọn không hợp lệ!');
                                }
                            });
                            
                            collector.on('end', collected => {
                                if (collected.size === 0) {
                                    interaction.followUp('⌛ Hết thời gian lựa chọn!');
                                }
                            });
                        });
                        
                        return;
                    }
                }
                
                return interaction.reply({ embeds: [embed] });
            }
             
            case 'trangthai': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                const stage = getCultivationStage(player.stage);
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`📊 Trạng Thái Của ${player.name}`)
                    .addFields(
                        { name: 'Cảnh Giới', value: player.stageName, inline: true },
                        { name: 'Tu Vi', value: `${player.exp}/${stage.expToNext}`, inline: true },
                        { name: 'Linh Thạch', value: `${player.stones}`, inline: true },
                        { name: 'Chỉ Số', value: `Sức Mạnh: ${player.power}\nTâm Linh: ${player.spirit}\nTốc Độ: ${player.speed.toFixed(2)}x`, inline: false }
                    );
                
                // Add skills if player has any
                if (player.skills && player.skills.length > 0) {
                    embed.addFields({ name: '🔮 Kỹ Năng', value: player.skills.join(', ') });
                }
                
                // Add weapons if player has any
                if (player.weapons && player.weapons.length > 0) {
                    const items = loadData(ITEMS_DATA_PATH);
                    const weaponNames = player.weapons.map(id => {
                        const weapon = items.weapons.find(w => w.id === id);
                        return weapon ? weapon.name : id;
                    });
                    embed.addFields({ name: '⚔️ Vũ Khí', value: weaponNames.join(', ') });
                }
                
                // Add artifacts if player has any
                if (player.artifacts && player.artifacts.length > 0) {
                    const items = loadData(ITEMS_DATA_PATH);
                    const artifactNames = player.artifacts.map(id => {
                        const artifact = items.artifacts.find(a => a.id === id);
                        return artifact ? artifact.name : id;
                    });
                    embed.addFields({ name: '🔮 Pháp Bảo', value: artifactNames.join(', ') });
                }
                
                // Add stats
                embed.addFields({ 
                    name: '📈 Thành Tích', 
                    value: `Số lần tu luyện: ${player.stats.cultivationTimes}\nĐột phá thành công: ${player.stats.breakthroughSuccesses}\nĐột phá thất bại: ${player.stats.breakthroughFailures}\nQuái vật đã đánh bại: ${player.stats.monstersDefeated}\nBoss đã đánh bại: ${player.stats.bossesDefeated}\nNhiệm vụ đã hoàn thành: ${player.stats.missionsCompleted}\nVật phẩm đã mua: ${player.stats.itemsPurchased}` 
                });
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'dotpha': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                // Check if player can breakthrough
                const breakthroughCheck = canBreakthrough(player);
                
                if (!breakthroughCheck.canBreak) {
                    return interaction.reply({
                        content: `⚠️ ${breakthroughCheck.reason}`,
                        ephemeral: true
                    });
                }
                
                // Perform breakthrough
                const result = attemptBreakthrough(player);
                
                // Save player
                savePlayerData(player);
                
                const embed = new EmbedBuilder()
                    .setColor(result.success ? '#00ff00' : '#ff0000')
                    .setTitle('🌟 Đột Phá Cảnh Giới')
                    .setDescription(result.message);
                
                if (result.success) {
                    embed.addFields(
                        { name: 'Cảnh Giới Mới', value: result.newStage, inline: true },
                        { name: 'Tu Vi', value: `${player.exp}`, inline: true }
                    );
                } else {
                    embed.addFields(
                        { name: 'Tu Vi Mất', value: `${result.expLost}`, inline: true },
                        { name: 'Tu Vi Còn Lại', value: `${player.exp}`, inline: true }
                    );
                }
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'nhiemvu': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                const missionId = interaction.options.getString('id');
                
                // If missionId is provided, complete the mission
                if (missionId) {
                    // Check cooldown
                    const cooldownTime = 3600 * 1000; // 1 hour in ms
                    const timeRemaining = cooldownTime - (Date.now() - player.cooldowns.missions);
                    
                    if (timeRemaining > 0) {
                        const minutes = Math.floor(timeRemaining / 60000);
                        const seconds = Math.floor((timeRemaining % 60000) / 1000);
                        return interaction.reply({
                            content: `Bạn đang trong thời gian hồi nhiệm vụ: ${minutes}m ${seconds}s. Hãy quay lại sau!`,
                            ephemeral: true
                        });
                    }
                    
                    const result = completeMission(player, missionId);
                    
                    if (!result.success) {
                        return interaction.reply({
                            content: result.message,
                            ephemeral: true
                        });
                    }
                    
                    // Save player
                    savePlayerData(player);
                    
                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Hoàn Thành Nhiệm Vụ')
                        .setDescription(result.message)
                        .addFields(
                            { name: 'Phần Thưởng', value: `Tu Vi: +${result.mission.reward.exp}\nLinh Thạch: +${result.mission.reward.stones}` },
                            { name: 'Hiện Tại', value: `Tu Vi: ${player.exp}\nLinh Thạch: ${player.stones}` }
                        );
                    
                    if (result.mission.reward.item) {
                        const items = loadData(ITEMS_DATA_PATH);
                        const allItems = [...items.weapons, ...items.artifacts, ...items.consumables];
                        const item = allItems.find(i => i.id === result.mission.reward.item);
                        
                        if (item) {
                            embed.addFields({ name: 'Vật Phẩm Nhận Được', value: item.name });
                        }
                    }
                    
                    return interaction.reply({ embeds: [embed] });
                }
                
                // Show available missions
                const { dailyMissions, specialMissions } = getAvailableMissions(player);
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📜 Nhiệm Vụ Có Sẵn')
                    .setDescription('Sử dụng `/tutien nhiemvu id:<id_nhiemvu>` để hoàn thành nhiệm vụ');
                
                if (dailyMissions.length > 0) {
                    embed.addFields({
                        name: '🔄 Nhiệm Vụ Hằng Ngày',
                        value: dailyMissions.map(m => `**${m.name}** (ID: \`${m.id}\`)\n${m.description}\nPhần thưởng: ${m.reward.exp} tu vi, ${m.reward.stones} linh thạch${m.reward.item ? ' + vật phẩm' : ''}`).join('\n\n')
                    });
                } else {
                    embed.addFields({
                        name: '🔄 Nhiệm Vụ Hằng Ngày',
                        value: 'Không có nhiệm vụ hằng ngày nào. Hãy quay lại sau!'
                    });
                }
                
                if (specialMissions.length > 0) {
                    embed.addFields({
                        name: '✨ Nhiệm Vụ Đặc Biệt',
                        value: specialMissions.map(m => `**${m.name}** (ID: \`${m.id}\`)\n${m.description}\nPhần thưởng: ${m.reward.exp} tu vi, ${m.reward.stones} linh thạch${m.reward.item ? ' + vật phẩm' : ''}`).join('\n\n')
                    });
                }
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'chiendau': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                const enemyId = interaction.options.getString('id');
                
                // Check cooldown
                const cooldownTime = 1800 * 1000; // 30 minutes in ms
                const timeRemaining = cooldownTime - (Date.now() - player.cooldowns.battle);
                
                if (timeRemaining > 0) {
                    const minutes = Math.floor(timeRemaining / 60000);
                    const seconds = Math.floor((timeRemaining % 60000) / 1000);
                    return interaction.reply({
                        content: `Bạn đang trong thời gian hồi chiến đấu: ${minutes}m ${seconds}s. Hãy quay lại sau!`,
                        ephemeral: true
                    });
                }
                
                // Perform battle
                const result = battle(player, enemyId);
                
                if (!result.success) {
                    return interaction.reply({
                        content: result.message,
                        ephemeral: true
                    });
                }
                
                // Save player
                savePlayerData(player);
                
                const embed = new EmbedBuilder()
                    .setColor(result.victory ? '#00ff00' : '#ff0000')
                    .setTitle(`⚔️ Chiến Đấu với ${result.enemy.name}`)
                    .setDescription(result.log.join('\n'))
                    .addFields(
                        { name: 'Kết Quả', value: result.victory ? '🏆 Chiến thắng!' : '💀 Thất bại!' }
                    );
                
                if (result.victory) {
                    embed.addFields(
                        { name: 'Phần Thưởng', value: `Tu Vi: +${result.rewards.exp}\nLinh Thạch: +${result.rewards.stones}` }
                    );
                } else {
                    embed.addFields(
                        { name: 'Tổn Thất', value: `Tu Vi: -${result.losses.exp}` }
                    );
                }
                
                embed.addFields(
                    { name: 'Hiện Tại', value: `Tu Vi: ${player.exp}\nLinh Thạch: ${player.stones}` }
                );
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'shop': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                const itemId = interaction.options.getString('id');
                
                // If itemId is provided, purchase the item
                if (itemId) {
                    const result = purchaseItem(player, itemId);
                    
                    if (!result.success) {
                        return interaction.reply({
                            content: result.message,
                            ephemeral: true
                        });
                    }
                    
                    // Save player
                    savePlayerData(player);
                    
                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('💰 Mua Vật Phẩm')
                        .setDescription(result.message)
                        .addFields(
                            { name: 'Linh Thạch Còn Lại', value: `${player.stones}` }
                        );
                    
                    return interaction.reply({ embeds: [embed] });
                }
                
                // Show shop items
                const items = getShopItems();
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🛒 Tiệm Pháp Bảo')
                    .setDescription(`Linh Thạch Hiện Có: ${player.stones}\nSử dụng \`/tutien shop id:<id_vatpham>\` để mua vật phẩm`);
                
                // Display weapons
                if (items.weapons && items.weapons.length > 0) {
                    embed.addFields({
                        name: '⚔️ Vũ Khí',
                        value: items.weapons.map(w => `**${w.name}** (ID: \`${w.id}\`) - ${w.price} linh thạch\n${w.description}\nSức Mạnh: +${w.power}`).join('\n\n')
                    });
                }
                
                // Display artifacts
                if (items.artifacts && items.artifacts.length > 0) {
                    embed.addFields({
                        name: '🔮 Pháp Bảo',
                        value: items.artifacts.map(a => `**${a.name}** (ID: \`${a.id}\`) - ${a.price} linh thạch\n${a.description}`).join('\n\n')
                    });
                }
                
                // Display consumables
                if (items.consumables && items.consumables.length > 0) {
                    embed.addFields({
                        name: '🧪 Đan Dược & Vật Phẩm',
                        value: items.consumables.map(c => `**${c.name}** (ID: \`${c.id}\`) - ${c.price} linh thạch\n${c.description}`).join('\n\n')
                    });
                }
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'bangxephang': {
                const rankings = getPlayerRanking();
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🏆 Bảng Xếp Hạng Tu Tiên')
                    .setDescription('Top tu sĩ mạnh nhất');
                
                let rankingText = '';
                
                rankings.forEach((p, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    rankingText += `${medal} **${p.name}** - ${p.stageName} (${p.exp} tu vi)\n`;
                });
                
                embed.addFields({ name: 'Xếp Hạng', value: rankingText || 'Chưa có người chơi nào.' });
                
                // Show player's own rank if they exist
                if (player) {
                    const playerRank = rankings.findIndex(p => p.id === player.id) + 1;
                    if (playerRank > 0) {
                        embed.addFields({ name: 'Xếp Hạng Của Bạn', value: `#${playerRank}` });
                    }
                }
                
                return interaction.reply({ embeds: [embed] });
            }
            
            case 'su-kien': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                const eventId = interaction.options.getString('id');
                const choiceIndex = interaction.options.getInteger('choice');
                
                // If eventId is provided, process the event
                if (eventId) {
                    // Check if choice is provided when needed
                    const events = loadData(EVENTS_DATA_PATH);
                    const event = events.events.find(e => e.id === eventId);
                    
                    if (!event) {
                        return interaction.reply({
                            content: "Sự kiện không tồn tại.",
                            ephemeral: true
                        });
                    }
                    
                    // Check if event has choices but choice wasn't provided
                    if (event.choices && choiceIndex === null) {
                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle(`✨ ${event.name}`)
                            .setDescription(event.description);
                        
                        // Format choices as A, B, C options
                        if (event.choices.length > 0) {
                            let choicesText = "Hãy reply với lựa chọn của bạn (A, B, C...):\n";
                            const choiceLabels = ['A', 'B', 'C', 'D', 'E'];
                            
                            event.choices.forEach((choice, index) => {
                                if (index < choiceLabels.length) {
                                    choicesText += `**${choiceLabels[index]}**: ${choice.text}\n`;
                                }
                            });
                            
                            embed.addFields({ name: 'Lựa Chọn', value: choicesText });
                            
                            // Create a collector for message replies
                            interaction.reply({ embeds: [embed] }).then(() => {
                                const filter = m => m.author.id === interaction.user.id;
                                const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
                                
                                collector.on('collect', message => {
                                    // Process the reply
                                    const choiceText = message.content.trim().toUpperCase();
                                    const choiceIndex = choiceLabels.indexOf(choiceText);
                                    
                                    if (choiceIndex >= 0 && choiceIndex < event.choices.length) {
                                        // Valid choice
                                        const result = processEventChoice(player, event.id, choiceIndex);
                                        
                                        if (result.success) {
                                            // Save player
                                            savePlayerData(player);
                                            
                                            const resultEmbed = new EmbedBuilder()
                                                .setColor('#00ff00')
                                                .setTitle(`✨ ${event.name}`)
                                                .setDescription(result.message);
                                            
                                            message.reply({ embeds: [resultEmbed] });
                                        } else {
                                            message.reply(`❌ ${result.message}`);
                                        }
                                    } else {
                                        message.reply('❌ Lựa chọn không hợp lệ!');
                                    }
                                });
                                
                                collector.on('end', collected => {
                                    if (collected.size === 0) {
                                        interaction.followUp('⌛ Hết thời gian lựa chọn!');
                                    }
                                });
                            });
                            
                            return;
                        }
                    }
                    
                    // Process event choice if provided directly
                    if (choiceIndex !== null) {
                        const result = processEventChoice(player, eventId, choiceIndex);
                        
                        if (!result.success) {
                            return interaction.reply({
                                content: result.message,
                                ephemeral: true
                            });
                        }
                        
                        // Save player
                        savePlayerData(player);
                        
                        const embed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle(`✨ ${result.event.name}`)
                            .setDescription(result.message);
                        
                        return interaction.reply({ embeds: [embed] });
                    }
                }
                
                // Check cooldown for triggering random event
                const cooldownTime = 7200 * 1000; // 2 hours in ms
                const timeRemaining = cooldownTime - (Date.now() - (player.cooldowns?.event || 0));
                
                if (timeRemaining > 0) {
                    const hours = Math.floor(timeRemaining / 3600000);
                    const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                    return interaction.reply({
                        content: `Bạn đang trong thời gian hồi sự kiện: ${hours}h ${minutes}m. Hãy quay lại sau!`,
                        ephemeral: true
                    });
                }
                
                // Trigger random event
                const event = triggerRandomEvent(player);
                
                if (!event) {
                    return interaction.reply({
                        content: "Bạn không gặp được sự kiện nào lúc này. Hãy thử lại sau!",
                        ephemeral: true
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`✨ ${event.name}`)
                    .setDescription(event.description);
                
                if (event.choices && event.choices.length > 0) {
                    // Format choices as A, B, C options
                    let choicesText = "Hãy reply với lựa chọn của bạn (A, B, C...):\n";
                    const choiceLabels = ['A', 'B', 'C', 'D', 'E'];
                    
                    event.choices.forEach((choice, index) => {
                        if (index < choiceLabels.length) {
                            choicesText += `**${choiceLabels[index]}**: ${choice.text}\n`;
                        }
                    });
                    
                    embed.addFields({ name: 'Lựa Chọn', value: choicesText });
                    
                    // Create a collector for message replies
                    interaction.reply({ embeds: [embed] }).then(() => {
                        const filter = m => m.author.id === interaction.user.id;
                        const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
                        
                        collector.on('collect', message => {
                            // Process the reply
                            const choiceText = message.content.trim().toUpperCase();
                            const choiceIndex = choiceLabels.indexOf(choiceText);
                            
                            if (choiceIndex >= 0 && choiceIndex < event.choices.length) {
                                // Valid choice
                                const result = processEventChoice(player, event.id, choiceIndex);
                                
                                if (result.success) {
                                    // Save player
                                    savePlayerData(player);
                                    
                                    const resultEmbed = new EmbedBuilder()
                                        .setColor('#00ff00')
                                        .setTitle(`✨ ${event.name}`)
                                        .setDescription(result.message);
                                    
                                    message.reply({ embeds: [resultEmbed] });
                                } else {
                                    message.reply(`❌ ${result.message}`);
                                }
                            } else {
                                message.reply('❌ Lựa chọn không hợp lệ!');
                            }
                        });
                        
                        collector.on('end', collected => {
                            if (collected.size === 0) {
                                interaction.followUp('⌛ Hết thời gian lựa chọn!');
                            }
                        });
                    });
                    
                    return;
                } else {
                    // Event without choices
                    const result = processEventChoice(player, event.id, 0);
                    
                    if (result.success) {
                        // Save player
                        savePlayerData(player);
                        
                        embed.addFields({ name: 'Kết Quả', value: result.message });
                    }
                    
                    return interaction.reply({ embeds: [embed] });
                }
            }
            
            case 'phapbao': {
                // Check if player exists
                if (!player) {
                    return interaction.reply({
                        content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                        ephemeral: true
                    });
                }
                
                const items = loadData(ITEMS_DATA_PATH);
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🔮 Pháp Bảo Của Bạn');
                
                // Check if player has weapons
                if (player.weapons && player.weapons.length > 0) {
                    const weaponDetails = player.weapons.map(id => {
                        const weapon = items.weapons.find(w => w.id === id);
                        if (weapon) {
                            return `**${weapon.name}**\n${weapon.description}\nSức Mạnh: +${weapon.power}`;
                        }
                        return `Không tìm thấy thông tin (ID: ${id})`;
                    });
                    
                    embed.addFields({ name: '⚔️ Vũ Khí', value: weaponDetails.join('\n\n') });
                } else {
                    embed.addFields({ name: '⚔️ Vũ Khí', value: 'Bạn chưa có vũ khí nào.' });
                }
                
                // Check if player has artifacts
                if (player.artifacts && player.artifacts.length > 0) {
                    const artifactDetails = player.artifacts.map(id => {
                        const artifact = items.artifacts.find(a => a.id === id);
                        if (artifact) {
                            return `**${artifact.name}**\n${artifact.description}`;
                        }
                        return `Không tìm thấy thông tin (ID: ${id})`;
                    });
                    
                    embed.addFields({ name: '🔮 Pháp Bảo', value: artifactDetails.join('\n\n') });
                } else {
                    embed.addFields({ name: '🔮 Pháp Bảo', value: 'Bạn chưa có pháp bảo nào.' });
                }
                
                // Check if player has items
                if (player.items && player.items.length > 0) {
                    const itemDetails = player.items.map(id => {
                        const item = items.consumables.find(c => c.id === id);
                        if (item) {
                            return `**${item.name}**\n${item.description}`;
                        }
                        return `Không tìm thấy thông tin (ID: ${id})`;
                    });
                    
                    embed.addFields({ name: '🧪 Đan Dược & Vật Phẩm', value: itemDetails.join('\n\n') });
                } else {
                    embed.addFields({ name: '🧪 Đan Dược & Vật Phẩm', value: 'Bạn chưa có đan dược hoặc vật phẩm nào.' });
                }
                
                return interaction.reply({ embeds: [embed] });
            }
            
            default:
                return interaction.reply({
                    content: 'Lệnh phụ không hợp lệ.',
                    ephemeral: true
                });
        }
    },
    
    // Handle button interactions for events
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('event_')) return false;
        
        // Parse event ID and choice
        const [_, eventId, choiceIndex] = interaction.customId.split('_');
        
        const userId = interaction.user.id;
        let player = getPlayerData(userId);
        
        if (!player) {
            return interaction.reply({
                content: 'Bạn chưa bắt đầu hành trình tu tiên! Hãy sử dụng `/tutien batdau`.',
                ephemeral: true
            });
        }
        
      
        const result = processEventChoice(player, eventId, parseInt(choiceIndex));
        
        if (!result.success) {
            return interaction.reply({
                content: result.message,
                ephemeral: true
            });
        }
        
       
        savePlayerData(player);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`✨ ${result.event.name}`)
            .setDescription(result.message);
        
        return interaction.update({ embeds: [embed], components: [] });
    }
};
