
const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Đường dẫn đến thư mục chứa dữ liệu
const dataPath = path.join(__dirname, '..', 'data');

// Hàm đọc dữ liệu từ file
function readData(fileName) {
    try {
        const filePath = path.join(dataPath, fileName);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Lỗi khi đọc ${fileName}:`, error);
        return null;
    }
}

// Hàm ghi dữ liệu vào file
function writeData(fileName, data) {
    try {
        const filePath = path.join(dataPath, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Lỗi khi ghi ${fileName}:`, error);
        return false;
    }
}

// Đọc dữ liệu từ các file
const floors = readData('floors.json');
const monsters = readData('monsters.json');
const items = readData('items.json');
const relics = readData('relics.json');
const settings = readData('settings.json');

// Hàm lấy dữ liệu người chơi
function getPlayerData(userId) {
    const players = readData('players.json') || {};
    return players[userId] || null;
}

// Hàm lưu dữ liệu người chơi
function savePlayerData(userId, playerData) {
    const players = readData('players.json') || {};
    players[userId] = playerData;
    return writeData('players.json', players);
}

// Hàm tạo nhân vật mới
function createNewPlayer(userId, name) {
    return {
        name: name,
        floor: 1,
        hp: settings.maxHP || 100,
        effects: [],
        inventory: [],
        relics: [],
        lastAction: new Date().toISOString()
    };
}

// Hàm xử lý hiệu ứng của tầng khi đi lên
function applyAscendingCurse(player) {
    const currentFloor = floors[player.floor];
    if (!currentFloor || !currentFloor.curse) return player;

    // Kiểm tra xác suất kích hoạt lời nguyền
    if (Math.random() <= currentFloor.curse.chance) {
        // Áp dụng hiệu ứng của lời nguyền
        const curseEffects = currentFloor.curse.effects || [];
        for (const effect of curseEffects) {
            if (effect.type === 'hpLoss') {
                player.hp = Math.max(1, player.hp - effect.amount);
            }
            if (effect.type === 'status' && !player.effects.includes(effect.value)) {
                player.effects.push(effect.value);
            }
        }
    }
    return player;
}

// Hàm kiểm tra các vật phẩm/quái vật ngẫu nhiên khi khám phá
function exploreFloor(player) {
    const currentFloor = floors[player.floor];
    if (!currentFloor) return { success: false, message: "Lỗi: Không tìm thấy dữ liệu tầng." };

    const randomChance = Math.random();
    
    // 50% gặp quái vật
    if (randomChance < 0.5 && currentFloor.monsters && currentFloor.monsters.length > 0) {
        const randomMonsterIndex = Math.floor(Math.random() * currentFloor.monsters.length);
        const monsterName = currentFloor.monsters[randomMonsterIndex];
        const monsterData = monsters[monsterName];
        
        // Xử lý gặp quái
        // Thực tế này nên là một hệ thống chiến đấu phức tạp hơn
        return {
            success: true,
            type: 'monster',
            monster: monsterName,
            message: `Bạn đã gặp ${monsterName}! Hãy cẩn thận!`
        };
    } 
    // 30% tìm thấy vật phẩm
    else if (randomChance < 0.8) {
        // Lấy danh sách vật phẩm có thể tìm thấy ở tầng này
        const availableItems = Object.keys(items).filter(item => 
            items[item].floor <= player.floor
        );
        
        if (availableItems.length > 0) {
            const randomItemIndex = Math.floor(Math.random() * availableItems.length);
            const itemName = availableItems[randomItemIndex];
            
            // Thêm vật phẩm vào túi đồ
            player.inventory.push(itemName);
            savePlayerData(player.id, player);
            
            return {
                success: true,
                type: 'item',
                item: itemName,
                message: `Bạn đã tìm thấy ${itemName}!`
            };
        }
    }
    // 10% tìm thấy di tích quý hiếm
    else if (randomChance < 0.9) {
        // Lấy danh sách di tích có thể tìm thấy ở tầng này
        const availableRelics = Object.keys(relics).filter(relic => 
            relics[relic].floor === player.floor
        );
        
        if (availableRelics.length > 0) {
            const randomRelicIndex = Math.floor(Math.random() * availableRelics.length);
            const relicName = availableRelics[randomRelicIndex];
            
            // Thêm di tích vào danh sách
            player.relics.push(relicName);
            savePlayerData(player.id, player);
            
            return {
                success: true,
                type: 'relic',
                relic: relicName,
                message: `Bạn đã tìm thấy di tích quý giá: ${relicName}!`
            };
        }
    }
    
    // Không có gì đặc biệt xảy ra
    return {
        success: true,
        type: 'nothing',
        message: `Bạn đã khám phá tầng ${player.floor} - ${currentFloor.name} nhưng không có gì đặc biệt.`
    };
}

// Hàm áp dụng hiệu ứng từ các status
function applyEffects(player) {
    if (!player.effects || player.effects.length === 0) return player;
    
    for (const effect of player.effects) {
        switch (effect) {
            case 'bleeding':
                // Mất máu do chảy máu
                player.hp = Math.max(1, player.hp - 5);
                break;
            case 'poisoned':
                // Mất máu do trúng độc
                player.hp = Math.max(1, player.hp - 3);
                break;
            // Thêm các hiệu ứng khác nếu cần
        }
    }
    
    return player;
}

// Tạo Embed thông báo
function createEmbed(title, description, color = '#FF0000') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

// Các lệnh chính của bot
module.exports = {
    data: new SlashCommandBuilder()
        .setName('abyss')
        .setDescription('Hệ thống game Made in Abyss')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Bắt đầu cuộc phiêu lưu của bạn trong Abyss')
                .addStringOption(option => 
                    option
                        .setName('name')
                        .setDescription('Tên nhân vật của bạn')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Xem trạng thái hiện tại của nhân vật')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('explore')
                .setDescription('Khám phá tầng hiện tại của Abyss')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('descend')
                .setDescription('Đi xuống tầng tiếp theo của Abyss')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ascend')
                .setDescription('Đi lên tầng trên (cẩn thận với lời nguyền!)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('heal')
                .setDescription('Hồi máu bằng vật phẩm hoặc nghỉ ngơi')
                .addStringOption(option => 
                    option
                        .setName('method')
                        .setDescription('Phương pháp hồi máu')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Nghỉ ngơi', value: 'rest' },
                            { name: 'Sử dụng vật phẩm', value: 'item' }
                        )
                )
                .addStringOption(option => 
                    option
                        .setName('item')
                        .setDescription('Vật phẩm muốn sử dụng (chỉ cần khi chọn phương pháp vật phẩm)')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Xem các vật phẩm và di tích trong túi đồ')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('save')
                .setDescription('Lưu tiến độ hiện tại')
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();

        // Xử lý lệnh START - bắt đầu game mới
        if (subcommand === 'start') {
            const name = interaction.options.getString('name');
            const existingPlayer = getPlayerData(userId);
            
            if (existingPlayer) {
                return interaction.reply({
                    embeds: [createEmbed(
                        '❌ Nhân vật đã tồn tại',
                        `Bạn đã có nhân vật tên ${existingPlayer.name} ở tầng ${existingPlayer.floor}. Hãy tiếp tục cuộc phiêu lưu của bạn!`,
                        '#FF0000'
                    )]
                });
            }
            
            // Tạo người chơi mới
            const newPlayer = createNewPlayer(userId, name);
            newPlayer.id = userId; // Lưu ID người chơi
            savePlayerData(userId, newPlayer);
            
            return interaction.reply({
                embeds: [createEmbed(
                    '🎮 Bắt đầu cuộc phiêu lưu mới',
                    `Chào mừng ${name} đến với Abyss! Bạn đang ở tầng 1 - Edge of the Abyss. Hãy sử dụng /abyss explore để bắt đầu khám phá!`,
                    '#00FF00'
                )]
            });
        }
        
        // Các lệnh sau đây yêu cầu người chơi đã có nhân vật
        const player = getPlayerData(userId);
        if (!player) {
            return interaction.reply({
                embeds: [createEmbed(
                    '❌ Chưa có nhân vật',
                    'Bạn chưa có nhân vật. Hãy sử dụng `/abyss start <tên>` để bắt đầu!',
                    '#FF0000'
                )]
            });
        }
        
        // Đảm bảo player có ID
        player.id = userId;

        // Xử lý lệnh STATUS - xem trạng thái
        if (subcommand === 'status') {
            const currentFloor = floors[player.floor];
            
            let effectsText = "Không có";
            if (player.effects && player.effects.length > 0) {
                effectsText = player.effects.join(", ");
            }
            
            let description = `
            **Tên**: ${player.name}
            **HP**: ${player.hp}/${settings.maxHP || 100}
            **Tầng**: ${player.floor} - ${currentFloor ? currentFloor.name : "Không xác định"}
            **Hiệu ứng**: ${effectsText}
            `;
            
            if (currentFloor && currentFloor.curse) {
                description += `\n**Lời nguyền tầng**: ${currentFloor.curse.name}`;
            }
            
            return interaction.reply({
                embeds: [createEmbed(
                    '📊 Trạng thái nhân vật',
                    description,
                    '#0099FF'
                )]
            });
        }
        
        // Xử lý lệnh EXPLORE - khám phá tầng hiện tại
        if (subcommand === 'explore') {
            // Áp dụng các hiệu ứng liên tục
            player = applyEffects(player);
            
            // Khám phá tầng
            const exploreResult = exploreFloor(player);
            
            let title, description, color;
            
            if (!exploreResult.success) {
                title = '❌ Lỗi khi khám phá';
                description = exploreResult.message;
                color = '#FF0000';
            } else {
                switch (exploreResult.type) {
                    case 'monster':
                        title = '⚔️ Gặp quái vật!';
                        description = exploreResult.message;
                        color = '#FF9900';
                        break;
                    case 'item':
                        title = '🎁 Tìm thấy vật phẩm!';
                        description = exploreResult.message;
                        color = '#00FF00';
                        break;
                    case 'relic':
                        title = '✨ Tìm thấy di tích!';
                        description = exploreResult.message;
                        color = '#FFFF00';
                        break;
                    default:
                        title = '🔍 Khám phá Abyss';
                        description = exploreResult.message;
                        color = '#0099FF';
                }
            }
            
            // Cập nhật thời gian hành động cuối cùng
            player.lastAction = new Date().toISOString();
            savePlayerData(userId, player);
            
            return interaction.reply({
                embeds: [createEmbed(title, description, color)]
            });
        }
        
        // Xử lý lệnh DESCEND - đi xuống tầng dưới
        if (subcommand === 'descend') {
            const maxFloor = Object.keys(floors).length;
            
            if (player.floor >= maxFloor) {
                return interaction.reply({
                    embeds: [createEmbed(
                        '❌ Không thể đi xuống',
                        'Bạn đã ở tầng sâu nhất của Abyss!',
                        '#FF0000'
                    )]
                });
            }
            
            // Tăng tầng lên 1
            player.floor += 1;
            const newFloor = floors[player.floor];
            
            // Cập nhật thời gian hành động
            player.lastAction = new Date().toISOString();
            savePlayerData(userId, player);
            
            return interaction.reply({
                embeds: [createEmbed(
                    '⬇️ Đi xuống tầng tiếp theo',
                    `Bạn đã đi xuống tầng ${player.floor} - ${newFloor.name}. Hãy cẩn thận, nguy hiểm đang chờ đợi!`,
                    '#0099FF'
                )]
            });
        }
        
        // Xử lý lệnh ASCEND - đi lên tầng trên (có hiệu ứng lời nguyền)
        if (subcommand === 'ascend') {
            if (player.floor <= 1) {
                return interaction.reply({
                    embeds: [createEmbed(
                        '❌ Không thể đi lên',
                        'Bạn đã ở tầng cao nhất của Abyss!',
                        '#FF0000'
                    )]
                });
            }
            
            // Áp dụng hiệu ứng lời nguyền khi đi lên
            const originalHP = player.hp;
            const originalEffects = [...player.effects];
            player = applyAscendingCurse(player);
            
            // Giảm tầng
            player.floor -= 1;
            const newFloor = floors[player.floor];
            
            // Tạo thông báo về hiệu ứng
            let curseMessage = '';
            if (originalHP > player.hp) {
                curseMessage += `Bạn mất ${originalHP - player.hp} HP do lời nguyền!\n`;
            }
            
            const newEffects = player.effects.filter(e => !originalEffects.includes(e));
            if (newEffects.length > 0) {
                curseMessage += `Bạn bị hiệu ứng: ${newEffects.join(', ')}`;
            }
            
            // Cập nhật thời gian hành động
            player.lastAction = new Date().toISOString();
            savePlayerData(userId, player);
            
            return interaction.reply({
                embeds: [createEmbed(
                    '⬆️ Đi lên tầng trên',
                    `Bạn đã đi lên tầng ${player.floor} - ${newFloor.name}.\n${curseMessage}`,
                    curseMessage ? '#FF9900' : '#0099FF'
                )]
            });
        }
        
        // Xử lý lệnh HEAL - hồi máu
        if (subcommand === 'heal') {
            const method = interaction.options.getString('method');
            
            if (method === 'rest') {
                // Hồi máu bằng cách nghỉ ngơi
                const healAmount = 20; // Có thể điều chỉnh theo settings
                const oldHP = player.hp;
                player.hp = Math.min(settings.maxHP || 100, player.hp + healAmount);
                
                // Cập nhật thời gian hành động
                player.lastAction = new Date().toISOString();
                savePlayerData(userId, player);
                
                return interaction.reply({
                    embeds: [createEmbed(
                        '💤 Nghỉ ngơi',
                        `Bạn đã nghỉ ngơi và hồi phục ${player.hp - oldHP} HP. HP hiện tại: ${player.hp}/${settings.maxHP || 100}`,
                        '#00FF00'
                    )]
                });
            } else if (method === 'item') {
                const itemName = interaction.options.getString('item');
                
                if (!itemName) {
                    // Hiển thị danh sách vật phẩm có thể dùng để hồi máu
                    const healingItems = player.inventory.filter(item => 
                        items[item] && items[item].type === 'healing'
                    );
                    
                    if (healingItems.length === 0) {
                        return interaction.reply({
                            embeds: [createEmbed(
                                '❌ Không có vật phẩm hồi máu',
                                'Bạn không có vật phẩm nào có thể dùng để hồi máu.',
                                '#FF0000'
                            )]
                        });
                    }
                    
                    const itemsList = healingItems.map(item => 
                        `- ${item}: Hồi ${items[item].healAmount} HP`
                    ).join('\n');
                    
                    return interaction.reply({
                        embeds: [createEmbed(
                            '🎒 Vật phẩm hồi máu',
                            `Các vật phẩm có thể dùng để hồi máu:\n${itemsList}\n\nSử dụng: \`/abyss heal item <tên vật phẩm>\``,
                            '#0099FF'
                        )]
                    });
                }
                
                // Kiểm tra vật phẩm có tồn tại trong túi đồ không
                const itemIndex = player.inventory.indexOf(itemName);
                if (itemIndex === -1) {
                    return interaction.reply({
                        embeds: [createEmbed(
                            '❌ Không tìm thấy vật phẩm',
                            `Bạn không có vật phẩm ${itemName} trong túi đồ.`,
                            '#FF0000'
                        )]
                    });
                }
                
                // Kiểm tra vật phẩm có phải loại hồi máu không
                const item = items[itemName];
                if (!item || item.type !== 'healing') {
                    return interaction.reply({
                        embeds: [createEmbed(
                            '❌ Không thể sử dụng',
                            `${itemName} không phải là vật phẩm hồi máu.`,
                            '#FF0000'
                        )]
                    });
                }
                
                // Sử dụng vật phẩm
                const healAmount = item.healAmount || 0;
                const oldHP = player.hp;
                player.hp = Math.min(settings.maxHP || 100, player.hp + healAmount);
                
                // Xóa vật phẩm khỏi túi đồ
                player.inventory.splice(itemIndex, 1);
                
                // Cập nhật thời gian hành động
                player.lastAction = new Date().toISOString();
                savePlayerData(userId, player);
                
                return interaction.reply({
                    embeds: [createEmbed(
                        '💊 Sử dụng vật phẩm',
                        `Bạn đã sử dụng ${itemName} và hồi phục ${player.hp - oldHP} HP. HP hiện tại: ${player.hp}/${settings.maxHP || 100}`,
                        '#00FF00'
                    )]
                });
            }
        }
        
        // Xử lý lệnh INVENTORY - xem túi đồ
        if (subcommand === 'inventory') {
            let inventoryText = "Không có vật phẩm nào";
            if (player.inventory && player.inventory.length > 0) {
                inventoryText = player.inventory.map(itemName => {
                    const item = items[itemName];
                    if (!item) return itemName;
                    
                    let itemDesc = `- ${itemName}`;
                    if (item.type === 'healing') {
                        itemDesc += ` (Hồi ${item.healAmount} HP)`;
                    }
                    return itemDesc;
                }).join('\n');
            }
            
            let relicsText = "Không có di tích nào";
            if (player.relics && player.relics.length > 0) {
                relicsText = player.relics.map(relicName => {
                    const relic = relics[relicName];
                    if (!relic) return relicName;
                    
                    return `- ${relicName} (Tầng ${relic.floor})`;
                }).join('\n');
            }
            
            return interaction.reply({
                embeds: [createEmbed(
                    '🎒 Túi đồ',
                    `**Vật phẩm:**\n${inventoryText}\n\n**Di tích:**\n${relicsText}`,
                    '#0099FF'
                )]
            });
        }
        
        // Xử lý lệnh SAVE - lưu tiến độ
        if (subcommand === 'save') {
            // Cập nhật thời gian hành động
            player.lastAction = new Date().toISOString();
            const saved = savePlayerData(userId, player);
            
            if (saved) {
                return interaction.reply({
                    embeds: [createEmbed(
                        '💾 Lưu tiến độ',
                        'Tiến độ của bạn đã được lưu thành công!',
                        '#00FF00'
                    )]
                });
            } else {
                return interaction.reply({
                    embeds: [createEmbed(
                        '❌ Lỗi khi lưu',
                        'Đã xảy ra lỗi khi lưu tiến độ. Vui lòng thử lại sau.',
                        '#FF0000'
                    )]
                });
            }
        }
        
        // Thông báo lỗi nếu lệnh không được xử lý
        return interaction.reply({
            embeds: [createEmbed(
                '❌ Lệnh không hợp lệ',
                'Lệnh này không tồn tại hoặc không được xử lý.',
                '#FF0000'
            )]
        });
    },
};
