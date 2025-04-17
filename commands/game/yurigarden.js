const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Đường dẫn đến các file dữ liệu
const PETS_PATH = path.join(__dirname, '../data/pets.json');
const PLAYERS_PATH = path.join(__dirname, '../data/players.json');
const FORESTS_PATH = path.join(__dirname, '../data/forests.json');

// Hàm đọc dữ liệu từ file
function readData(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            // Nếu file không tồn tại, tạo file mới với dữ liệu mặc định
            if (filePath === PETS_PATH) {
                fs.writeFileSync(filePath, JSON.stringify({
                    pets: [
                        {
                            id: "wolf1",
                            name: "Sói Xám",
                            rarity: "phổ biến",
                            type: "thú",
                            moves: [
                                { name: "Cào Vuốt", damage: 20, cooldown: 1 },
                                { name: "Cắn Xé", damage: 35, cooldown: 2 }
                            ],
                            hp: 100,
                            defaultLocation: "rừng_thông"
                        },
                        {
                            id: "phoenix1",
                            name: "Phượng Hoàng Lửa",
                            rarity: "hiếm",
                            type: "lửa",
                            moves: [
                                { name: "Ngọn Lửa", damage: 30, cooldown: 1 },
                                { name: "Cánh Lửa", damage: 40, cooldown: 2 },
                                { name: "Hỏa Diệm", damage: 60, cooldown: 3 }
                            ],
                            hp: 120,
                            defaultLocation: "núi_lửa"
                        }
                    ]
                }, null, 2));
            } else if (filePath === PLAYERS_PATH) {
                fs.writeFileSync(filePath, JSON.stringify({ players: [] }, null, 2));
            } else if (filePath === FORESTS_PATH) {
                fs.writeFileSync(filePath, JSON.stringify({
                    forests: [
                        {
                            id: "rừng_thông",
                            name: "Rừng Thông",
                            description: "Khu rừng với nhiều cây thông và động vật hoang dã",
                            pets: [
                                { id: "wolf1", chance: 70 },
                                { id: "fox1", chance: 25 },
                                { id: "rare_wolf", chance: 5 }
                            ]
                        },
                        {
                            id: "núi_lửa",
                            name: "Núi Lửa",
                            description: "Núi lửa nóng bỏng với những sinh vật lửa",
                            pets: [
                                { id: "fire_lizard", chance: 60 },
                                { id: "lava_slug", chance: 30 },
                                { id: "phoenix1", chance: 10 }
                            ]
                        }
                    ]
                }, null, 2));
            }
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Lỗi khi đọc file ${filePath}:`, error);
        return null;
    }
}

// Hàm lưu dữ liệu vào file
function saveData(data, filePath) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Lỗi khi lưu file ${filePath}:`, error);
        return false;
    }
}

// Hàm lấy hoặc tạo thông tin người chơi
function getPlayerData(userId) {
    const playersData = readData(PLAYERS_PATH);
    if (!playersData) return null;

    // Nếu players chưa tồn tại, khởi tạo nó
    if (!Array.isArray(playersData.players)) {
        playersData.players = [];
    }

    let player = playersData.players.find(p => p.userId === userId);
    if (!player) {
        player = {
            userId: userId,
            pets: [],
            activePet: null,
            coins: 1000,
            inventory: {
                food: [
                    { id: "basic_food", name: "Thức ăn thường", amount: 5, evolvePower: 10 }
                ]
            }
        };
        playersData.players.push(player);
    
        saveData(playersData, PLAYERS_PATH);
    }
    return player;
}

// Hàm lấy thông tin pet
function getPetData(petId) {
    const petsData = readData(PETS_PATH);
    if (!petsData) return null;

    return petsData.pets.find(p => p.id === petId);
}

// Hàm random pet trong khu rừng
function getRandomPetFromForest(forestId) {
    const forestsData = readData(FORESTS_PATH);
    if (!forestsData) return null;

    const forest = forestsData.forests.find(f => f.id === forestId);
    if (!forest) return null;

    // Tạo mảng tỉ lệ tích lũy
    let totalChance = 0;
    const chances = forest.pets.map(pet => {
        totalChance += pet.chance;
        return { id: pet.id, chance: totalChance };
    });

    // Random số từ 0 đến tổng tỉ lệ
    const random = Math.random() * totalChance;
    
    // Tìm pet dựa trên tỉ lệ
    for (const pet of chances) {
        if (random <= pet.chance) {
            return getPetData(pet.id);
        }
    }
    
    // Mặc định trả về pet đầu tiên nếu có lỗi
    return getPetData(forest.pets[0].id);
}

// Command Handler
module.exports = {
    data: new SlashCommandBuilder()
        .setName('yurigarden')
        .setDescription('Hệ thống Yuri Garden - Thu thập và chiến đấu với thú cưng')
        .addSubcommand(subcommand =>
            subcommand
                .setName('explore')
                .setDescription('Khám phá khu rừng để tìm thú cưng')
                .addStringOption(option =>
                    option
                        .setName('forest')
                        .setDescription('Chọn khu rừng bạn muốn khám phá')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Rừng Thông', value: 'rừng_thông' },
                            { name: 'Núi Lửa', value: 'núi_lửa' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('battle')
                .setDescription('Thách đấu người chơi khác')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('Người chơi bạn muốn thách đấu')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Xem thú cưng và vật phẩm của bạn')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('shop')
                .setDescription('Mua thức ăn và vật phẩm')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('help')
                .setDescription('hướng dẫn chơi game')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('feed')
                .setDescription('Cho thú cưng ăn để tiến hóa')
                .addStringOption(option =>
                    option
                        .setName('pet_id')
                        .setDescription('ID của thú cưng bạn muốn cho ăn')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('food_id')
                        .setDescription('ID của thức ăn bạn muốn dùng')
                        .setRequired(true)
                )
        ),

    // Xử lý lệnh
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Xử lý các lệnh con
        switch (subcommand) {
            case 'explore':
                await handleExplore(interaction);
                break;
            case 'battle':
                await handleBattle(interaction);
                break;
            case 'inventory':
                await handleInventory(interaction);
                break;
            case 'shop':
                await handleShop(interaction);
                break;
            case 'feed':
                await handleFeed(interaction);
                break;
            case 'help':
                await handleHelp(interaction);
                break;
            default:
                await interaction.reply({ content: 'Lệnh không hợp lệ!', ephemeral: true });
        }
    }
};

// Xử lý lệnh explore
async function handleExplore(interaction) {
    const forestId = interaction.options.getString('forest');
    const forestsData = readData(FORESTS_PATH);
    
    if (!forestsData) {
        return await interaction.reply({ content: 'Có lỗi xảy ra khi đọc dữ liệu khu rừng!', ephemeral: true });
    }

    const forest = forestsData.forests.find(f => f.id === forestId);
    if (!forest) {
        return await interaction.reply({ content: 'Khu rừng không tồn tại!', ephemeral: true });
    }

    // Tạo embed thông tin rừng
    const forestEmbed = new EmbedBuilder()
        .setTitle(`🌲 ${forest.name}`)
        .setDescription(`${forest.description}\n\nBạn đang khám phá, hãy bấm nút bên dưới để tìm thú cưng!`)
        .setColor('#2ecc71')
        .setFooter({ text: 'Yuri Garden' });

    // Tạo nút bấm
    const exploreButton = new ButtonBuilder()
        .setCustomId(`tame_${forestId}`)
        .setLabel('🎯 Tìm Thú Cưng')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(exploreButton);

    const message = await interaction.reply({ embeds: [forestEmbed], components: [row], fetchReply: true });

    // Tạo collector để theo dõi nút bấm
    const filter = i => {
        return i.customId.startsWith('tame_') && i.user.id === interaction.user.id;
    };

    const collector = message.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        // Lấy random pet từ khu rừng
        const randomPet = getRandomPetFromForest(forestId);
        if (!randomPet) {
            return await i.reply({ content: 'Có lỗi xảy ra khi tìm thú cưng!', ephemeral: true });
        }

        // Tạo bản sao của pet với ID duy nhất cho người chơi
        const playerPet = {
            ...JSON.parse(JSON.stringify(randomPet)),
            id: `${randomPet.id}_${Date.now()}`, // Tạo ID duy nhất
            level: 1,
            exp: 0,
            friendship: 0,
            captureDate: new Date().toISOString()
        };

        // Lưu pet vào dữ liệu người chơi
        const player = getPlayerData(i.user.id);
        if (!player) {
            return await i.reply({ content: 'Có lỗi xảy ra khi lưu dữ liệu người chơi!', ephemeral: true });
        }

        player.pets.push(playerPet);
        if (!player.activePet) {
            player.activePet = playerPet.id;
        }

        const playersData = readData(PLAYERS_PATH);
        const playerIndex = playersData.players.findIndex(p => p.userId === i.user.id);
        playersData.players[playerIndex] = player;
        saveData(playersData, PLAYERS_PATH);

        // Tạo embed thông báo
        const tameEmbed = new EmbedBuilder()
            .setTitle(`✨ Bạn đã bắt được ${playerPet.name}!`)
            .setDescription(`**Loài:** ${playerPet.name}\n**Độ hiếm:** ${playerPet.rarity}\n**Cấp độ:** ${playerPet.level}\n\nSử dụng /yurigarden inventory để xem thú cưng của bạn!`)
            .setColor('#f1c40f')
            .setFooter({ text: 'Yuri Garden' });

        // Vô hiệu hóa nút cũ
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`tame_${forestId}`)
                .setLabel('✅ Đã bắt được thú cưng!')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        );

        await i.update({ embeds: [tameEmbed], components: [disabledRow] });
        
        // Kết thúc collector vì đã hoàn thành tác vụ
        collector.stop();
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`tame_${forestId}`)
                    .setLabel('🎯 Tìm Thú Cưng')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );
            interaction.editReply({ components: [disabledRow] }).catch(console.error);
        }
    });
}

// Xử lý lệnh battle
async function handleBattle(interaction) {
    const challenger = interaction.user;
    const target = interaction.options.getUser('target');

    // Kiểm tra để không thách đấu chính mình
    if (challenger.id === target.id) {
        return await interaction.reply({ content: 'Bạn không thể thách đấu chính mình!', ephemeral: true });
    }

    // Kiểm tra dữ liệu người chơi
    const challengerData = getPlayerData(challenger.id);
    const targetData = getPlayerData(target.id);

    if (!challengerData.activePet) {
        return await interaction.reply({ content: 'Bạn chưa có thú cưng nào hoạt động!', ephemeral: true });
    }

    if (!targetData || !targetData.activePet) {
        return await interaction.reply({ content: `${target.username} chưa có thú cưng nào hoạt động!`, ephemeral: true });
    }

    // Lấy thông tin pet của cả hai người chơi
    const challengerPet = challengerData.pets.find(p => p.id === challengerData.activePet);
    const targetPet = targetData.pets.find(p => p.id === targetData.activePet);

    if (!challengerPet || !targetPet) {
        return await interaction.reply({ content: 'Không tìm thấy thú cưng hoạt động!', ephemeral: true });
    }

    // Tạo phiên chiến đấu mới
    const battleId = `battle_${Date.now()}`;
    const battleData = {
        id: battleId,
        challenger: {
            userId: challenger.id,
            username: challenger.username,
            petId: challengerPet.id,
            petName: challengerPet.name,
            currentHp: challengerPet.hp,
            moves: challengerPet.moves
        },
        target: {
            userId: target.id,
            username: target.username,
            petId: targetPet.id,
            petName: targetPet.name,
            currentHp: targetPet.hp,
            moves: targetPet.moves
        },
        turn: challenger.id, // Người thách đấu đi trước
        status: 'waiting', // Trạng thái: waiting, active, ended
        rounds: 0,
        lastUpdate: new Date().toISOString()
    };

    // Lưu phiên chiến đấu vào một biến toàn cục tạm thời (trong môi trường thực tế, nên lưu vào DB)
    if (!global.battles) global.battles = {};
    global.battles[battleId] = battleData;

    // Tạo embed chiến đấu
    const battleEmbed = createBattleEmbed(battleData);

    // Tạo các nút tấn công cho người chơi hiện tại
    const attackButtons = createAttackButtons(battleData);

    const message = await interaction.reply({ 
        content: `${target}, bạn đã bị thách đấu bởi ${challenger.username}!`,
        embeds: [battleEmbed], 
        components: attackButtons,
        fetchReply: true
    });

    // Tạo collector để theo dõi các nút tương tác
    const filter = i => {
        return (i.customId.includes(battleId) && 
                (i.user.id === challenger.id || i.user.id === target.id) &&
                i.user.id === global.battles[battleId].turn);
    };

    const collector = message.createMessageComponentCollector({ filter, time: 600000 }); // 10 phút

    collector.on('collect', async i => {
        // Xử lý các tương tác
        const battle = global.battles[battleId];
        if (!battle || battle.status === 'ended') {
            await i.reply({ content: 'Trận đấu đã kết thúc!', ephemeral: true });
            return collector.stop();
        }

        // Xác định người chơi và đối thủ
        const isChallenger = i.user.id === challenger.id;
        const attacker = isChallenger ? battle.challenger : battle.target;
        const defender = isChallenger ? battle.target : battle.challenger;

        if (i.customId.includes('battle_attack_')) {
            // Xử lý tấn công
            const moveIndex = parseInt(i.customId.split('_').pop());
            const move = attacker.moves[moveIndex];
            
            if (!move) {
                await i.reply({ content: 'Chiêu thức không hợp lệ!', ephemeral: true });
                return;
            }

            // Tính toán sát thương
            let damage = move.damage;
            
            // Giảm HP đối thủ
            defender.currentHp -= damage;
            if (defender.currentHp < 0) defender.currentHp = 0;

            // Cập nhật thông tin trận chiến
            battle.lastUpdate = new Date().toISOString();
            battle.rounds += 1;
            
            // Kiểm tra kết thúc trận đấu
            if (defender.currentHp <= 0) {
                battle.status = 'ended';
                battle.winner = attacker.userId;
                
                // Thưởng cho người thắng
                const winnerData = getPlayerData(attacker.userId);
                winnerData.coins += 1000;
                
                const playersData = readData(PLAYERS_PATH);
                const winnerIndex = playersData.players.findIndex(p => p.userId === attacker.userId);
                playersData.players[winnerIndex] = winnerData;
                saveData(playersData, PLAYERS_PATH);
                
                // Tạo embed kết thúc
                const endEmbed = new EmbedBuilder()
                    .setTitle(`🏆 Kết thúc trận đấu!`)
                    .setDescription(`**${attacker.username}** đã chiến thắng!\n\n${attacker.petName} đã đánh bại ${defender.petName} sau ${battle.rounds} lượt.\n\n**${attacker.username}** nhận được 1000 coins!`)
                    .setColor('#f1c40f')
                    .setFooter({ text: 'Yuri Garden Battle' });
                    
                await i.update({ embeds: [endEmbed], components: [] });
                collector.stop();
                return;
            }
            
            // Đổi lượt
            battle.turn = defender.userId;
            
            // Cập nhật embed và nút
            const updatedEmbed = createBattleEmbed(battle);
            const newButtons = createAttackButtons(battle);
            
            await i.update({ embeds: [updatedEmbed], components: newButtons });
        } else if (i.customId.includes('battle_defend_')) {
            // Xử lý phòng thủ
            // Phục hồi HP khi phòng thủ (15% HP gốc)
            const petTemplate = getPetData(attacker.petId.split('_')[0]);
            
            const healAmount = Math.floor(petTemplate.hp * 0.15);
            attacker.currentHp += healAmount;
            
            // Không vượt quá HP tối đa
            if (attacker.currentHp > petTemplate.hp) {
                attacker.currentHp = petTemplate.hp;
            }

            // Cập nhật thông tin trận chiến
            battle.lastUpdate = new Date().toISOString();
            battle.rounds += 1;
            
            // Đổi lượt
            battle.turn = defender.userId;
            
            // Cập nhật embed và nút
            const updatedEmbed = createBattleEmbed(battle);
            const newButtons = createAttackButtons(battle);
            
            await i.update({ embeds: [updatedEmbed], components: newButtons });
        }
    });

    collector.on('end', () => {
        if (global.battles[battleId] && global.battles[battleId].status !== 'ended') {
            global.battles[battleId].status = 'ended';
            global.battles[battleId].winner = 'timeout';
            
            const timeoutEmbed = new EmbedBuilder()
                .setTitle(`⏱️ Hết thời gian!`)
                .setDescription(`Trận đấu đã kết thúc do hết thời gian chờ!`)
                .setColor('#95a5a6')
                .setFooter({ text: 'Yuri Garden Battle' });
                
            interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
        }
    });
}

// Tạo embed cho trận chiến
function createBattleEmbed(battleData) {
    const { challenger, target, turn } = battleData;
    
    return new EmbedBuilder()
        .setTitle(`⚔️ Trận chiến Pet`)
        .setDescription(`**${challenger.username}** (${challenger.petName}) VS **${target.username}** (${target.petName})`)
        .addFields(
            { name: `${challenger.petName} [${challenger.username}]`, value: `❤️ HP: ${challenger.currentHp}`, inline: true },
            { name: `${target.petName} [${target.username}]`, value: `❤️ HP: ${target.currentHp}`, inline: true },
            { name: 'Lượt hiện tại', value: turn === challenger.userId ? challenger.username : target.username, inline: false }
        )
        .setColor('#e74c3c')
        .setFooter({ text: `Yuri Garden Battle • Vòng ${battleData.rounds + 1}` });
}

// Tạo các nút tấn công dựa trên lượt hiện tại
function createAttackButtons(battleData) {
    const { challenger, target, turn, id: battleId } = battleData;
    const currentPlayer = turn === challenger.userId ? challenger : target;
    
    // Tạo các nút tấn công từ chiêu thức của pet hiện tại
    const buttons = currentPlayer.moves.map((move, index) => {
        return new ButtonBuilder()
            .setCustomId(`battle_attack_${battleId}_${index}`)
            .setLabel(`${move.name} (${move.damage} DMG)`)
            .setStyle(ButtonStyle.Danger);
    });

    // Thêm nút phòng thủ
    buttons.push(
        new ButtonBuilder()
            .setCustomId(`battle_defend_${battleId}`)
            .setLabel(`🛡️ Phòng thủ`)
            .setStyle(ButtonStyle.Success)
    );

    // Chia thành các hàng, tối đa 5 nút mỗi hàng
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
        rows.push(row);
    }

    return rows;
}

// Xử lý lệnh inventory
async function handleInventory(interaction) {
    const player = getPlayerData(interaction.user.id);
    
    if (!player) {
        return await interaction.reply({ content: 'Có lỗi xảy ra khi đọc dữ liệu người chơi!', ephemeral: true });
    }
    
    if (player.pets.length === 0) {
        return await interaction.reply({ content: 'Bạn chưa có thú cưng nào! Hãy dùng lệnh `/yurigarden explore` để tìm thú cưng!', ephemeral: true });
    }
    
    // Tạo embed inventory
    const inventoryEmbed = new EmbedBuilder()
        .setTitle(`🎒 Túi đồ của ${interaction.user.username}`)
        .setDescription(`**Coins:** ${player.coins} 💰\n\n**Thú cưng của bạn:**`)
        .setColor('#3498db')
        .setFooter({ text: 'Yuri Garden' });
    
    // Thêm thông tin về từng pet
    player.pets.forEach((pet, index) => {
        const isActive = pet.id === player.activePet ? '✅' : '';
        inventoryEmbed.addFields({
            name: `${index + 1}. ${pet.name} ${isActive}`,
            value: `**ID:** ${pet.id}\n**Cấp độ:** ${pet.level}\n**Loại:** ${pet.type}\n**Độ hiếm:** ${pet.rarity}\n**HP:** ${pet.hp}`,
            inline: true
        });
    });
    
    // Thêm thông tin về thức ăn
    if (player.inventory.food.length > 0) {
        inventoryEmbed.addFields({
            name: `🍖 Thức ăn`,
            value: player.inventory.food.map(f => `${f.name} (${f.amount}x)`).join('\n'),
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [inventoryEmbed] });
}

async function handleHelp(interaction) {
    const petsPath = path.join(__dirname, '../data/pets.json');
    const petsData = JSON.parse(fs.readFileSync(petsPath, 'utf8')).pets;
    let index = 0;

    const helpEmbed = new EmbedBuilder()
        .setTitle('📖 Hướng dẫn sử dụng Yuri Garden')
        .setDescription(`
**/explore** – Khám phá khu rừng để tìm thú cưng  
**/battle** – Thách đấu người chơi khác  
**/inventory** – Xem thú cưng và vật phẩm bạn đang sở hữu  
**/shop** – Mua thức ăn để tiến hóa thú cưng  
**/feed** – Cho thú cưng ăn để lên cấp
        `)
        .setImage('https://i.imgur.com/uatLeYK.png')
        .setColor('#2ecc71')
        .setFooter({ text: 'Yuri Garden - Trang 1' });

    const nextBtn = new ButtonBuilder()
        .setCustomId('next_pet')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(nextBtn);

    await interaction.reply({
        embeds: [helpEmbed],
        components: [row],
        ephemeral: true
    });

    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.customId === 'next_pet' && i.user.id === interaction.user.id,
        time: 60000
    });

    collector.on('collect', async i => {
        if (index >= petsData.length) index = 0;
        const pet = petsData[index];

        const petEmbed = new EmbedBuilder()
            .setTitle(`🐾 ${pet.name}`)
            .setColor('#f39c12')
            .setDescription(`**Loại:** ${pet.type}\n**Độ hiếm:** ${pet.rarity}\n**HP:** ${pet.hp}\n**Khu rừng:** ${pet.defaultLocation.replace(/_/g, ' ')}`)
            .addFields({
                name: '💥 Chiêu thức',
                value: pet.moves.map(m => `• ${m.name}: ${m.damage} dmg / ${m.cooldown} lượt`).join('\n')
            })
            .setFooter({ text: `Pet ${index + 1}/${petsData.length}` });

        await i.update({ embeds: [petEmbed], components: [row] });
        index++;
    });

    collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            ButtonBuilder.from(nextBtn).setDisabled(true)
        );
        await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
}

// Xử lý lệnh shop
async function handleShop(interaction) {
    const player = getPlayerData(interaction.user.id);
    
    if (!player) {
        return await interaction.reply({ content: 'Có lỗi xảy ra khi đọc dữ liệu người chơi!', ephemeral: true });
    }
    
    // Danh sách sản phẩm trong shop
    const shopItems = [
        { id: 'basic_food', name: 'Thức ăn thường', price: 100, evolvePower: 10, description: 'Tăng 10 điểm tiến hóa cho pet' },
        { id: 'premium_food', name: 'Thức ăn cao cấp', price: 300, evolvePower: 30, description: 'Tăng 30 điểm tiến hóa cho pet' },
        { id: 'royal_food', name: 'Thức ăn hoàng gia', price: 1000, evolvePower: 100, description: 'Tăng 100 điểm tiến hóa cho pet' },
        { id: 'mystic_fruit', name: 'Quả thần bí', price: 500, evolvePower: 50, description: 'Một loại trái cây hiếm giúp pet tiến hóa nhanh hơn (50 điểm)' },
        { id: 'glowing_snack', name: 'Bánh phát sáng', price: 800, evolvePower: 80, description: 'Tăng 80 điểm tiến hóa, có hiệu ứng ánh sáng kỳ lạ' },
        { id: 'ancient_feast', name: 'Yến tiệc cổ đại', price: 2000, evolvePower: 200, description: 'Một bữa tiệc xa xỉ từ thời cổ xưa, tăng 200 điểm tiến hóa' }
    ];
    
    // Tạo embed shop
    const shopEmbed = new EmbedBuilder()
        .setTitle(`🏪 Cửa hàng Yuri Garden`)
        .setDescription(`**Coins của bạn:** ${player.coins} 💰\n\nHãy chọn vật phẩm bạn muốn mua:`)
        .setColor('#9b59b6')
        .setFooter({ text: 'Yuri Garden Shop' });
    
    // Thêm thông tin về từng sản phẩm
    shopItems.forEach((item, index) => {
        shopEmbed.addFields({
            name: `${index + 1}. ${item.name} - ${item.price} coins`,
            value: item.description,
            inline: true
        });
    });
    const buyButtons = shopItems.map((item, index) => {
        return new ButtonBuilder()
            .setCustomId(`buy_${item.id}`)
            .setLabel(`Mua ${item.name}`)
            .setStyle(ButtonStyle.Success);
    });
    
    // Chia thành các hàng, tối đa 5 nút mỗi hàng
    const rows = [];
    for (let i = 0; i < buyButtons.length; i += 3) {
        const row = new ActionRowBuilder().addComponents(buyButtons.slice(i, i + 3));
        rows.push(row);
    }
    
    const message = await interaction.reply({ embeds: [shopEmbed], components: rows, fetchReply: true });
    
    // Tạo collector cho các nút mua
    const filter = i => {
        return i.customId.startsWith('buy_') && i.user.id === interaction.user.id;
    };
    
    const collector = message.createMessageComponentCollector({ filter, time: 60000 });
    
    collector.on('collect', async i => {
        const itemId = i.customId.replace('buy_', '');
        const item = shopItems.find(item => item.id === itemId);
    
        if (!item) {
            return await i.reply({ content: '❌ Vật phẩm không tồn tại!', ephemeral: true });
        }
    
        if (player.coins < item.price) {
            return await i.reply({ content: `Bạn không đủ coins để mua ${item.name}! Cần thêm ${item.price - player.coins} coins.`, ephemeral: true });
        }
    
        const existingFoodIndex = player.inventory.food.findIndex(f => f.id === item.id);
        if (existingFoodIndex >= 0) {
            player.inventory.food[existingFoodIndex].amount += 1;
        } else {
            player.inventory.food.push({
                id: item.id,
                name: item.name,
                amount: 1,
                evolvePower: item.evolvePower
            });
        }
    
        player.coins -= item.price;
    
        const playersData = readData(PLAYERS_PATH);
        const playerIndex = playersData.players.findIndex(p => p.userId === interaction.user.id);
        playersData.players[playerIndex] = player;
        saveData(playersData, PLAYERS_PATH);
    
        await i.reply({ content: `✅ Bạn đã mua thành công ${item.name}! Còn lại ${player.coins} coins.`, ephemeral: true });
    
        shopEmbed.setDescription(`**Coins của bạn:** ${player.coins} 💰\n\nHãy chọn vật phẩm bạn muốn mua:`);
        await interaction.editReply({ embeds: [shopEmbed] });
    });
    
    collector.on('end', () => {
        // Vô hiệu hóa các nút khi hết thời gian
        const disabledRows = rows.map(row => {
            const newRow = new ActionRowBuilder();
            row.components.forEach(button => {
                newRow.addComponents(
                    ButtonBuilder.from(button).setDisabled(true)
                );
            });
            return newRow;
        });
        
        interaction.editReply({ components: disabledRows }).catch(console.error);
    });
}

// Xử lý lệnh feed
async function handleFeed(interaction) {
    const petId = interaction.options.getString('pet_id');
    const foodId = interaction.options.getString('food_id');
    
    const player = getPlayerData(interaction.user.id);
    if (!player) {
        return await interaction.reply({ content: 'Có lỗi xảy ra khi đọc dữ liệu người chơi!', ephemeral: true });
    }
    
    // Kiểm tra xem pet có tồn tại không
    const petIndex = player.pets.findIndex(p => p.id === petId);
    if (petIndex < 0) {
        return await interaction.reply({ content: 'Không tìm thấy thú cưng với ID đã cho!', ephemeral: true });
    }
    
    // Kiểm tra xem thức ăn có tồn tại không
    const foodIndex = player.inventory.food.findIndex(f => f.id === foodId);
    if (foodIndex < 0 || player.inventory.food[foodIndex].amount <= 0) {
        return await interaction.reply({ content: 'Bạn không có thức ăn này trong túi đồ!', ephemeral: true });
    }
    
    const pet = player.pets[petIndex];
    const food = player.inventory.food[foodIndex];
    
    // Tạo trường "evolution" nếu chưa có
    if (!pet.evolution) {
        pet.evolution = {
            points: 0,
            maxPoints: 100 * pet.level, // Số điểm cần để tiến hóa
            stage: 0 // Giai đoạn tiến hóa
        };
    }
    
    // Thêm điểm tiến hóa
    pet.evolution.points += food.evolvePower;
    
    // Giảm số lượng thức ăn
    food.amount -= 1;
    if (food.amount <= 0) {
        player.inventory.food.splice(foodIndex, 1);
    }
    
    // Kiểm tra xem có thể tiến hóa không
    let evolved = false;
    let newName = pet.name;
    
    if (pet.evolution.points >= pet.evolution.maxPoints) {
        // Tiến hóa thú cưng
        pet.level += 1;
        pet.evolution.points -= pet.evolution.maxPoints;
        pet.evolution.maxPoints = 100 * pet.level; // Tăng yêu cầu cho lần tiến hóa tiếp theo
        pet.evolution.stage += 1;
        
        // Tăng chỉ số
        pet.hp += Math.floor(pet.hp * 0.2); // Tăng 20% HP
        
        // Thêm chiêu thức mới nếu đạt đến ngưỡng
        if (pet.evolution.stage === 1 && pet.moves.length < 4) {
            // Thêm chiêu thức mới cho giai đoạn 1
            pet.moves.push({
                name: `Đòn Mạnh của ${pet.name}`,
                damage: Math.floor(pet.moves[0].damage * 1.5),
                cooldown: 3
            });
        } else if (pet.evolution.stage === 3 && pet.moves.length < 5) {
            // Thêm chiêu thức mạnh cho giai đoạn 3
            pet.moves.push({
                name: `Bí Kíp Tối Thượng`,
                damage: Math.floor(pet.moves[0].damage * 2.5),
                cooldown: 5
            });
        }
        
        // Thay đổi tên thú cưng dựa trên giai đoạn tiến hóa
        if (pet.evolution.stage === 1) {
            newName = `${pet.name} Tiến Hóa`;
        } else if (pet.evolution.stage === 2) {
            newName = `${pet.name} Cao Cấp`;
        } else if (pet.evolution.stage >= 3) {
            newName = `${pet.name} Huyền Thoại`;
        }
        
        pet.name = newName;
        evolved = true;
    }
    
    // Lưu dữ liệu
    const playersData = readData(PLAYERS_PATH);
    const playerIndex = playersData.players.findIndex(p => p.userId === interaction.user.id);
    playersData.players[playerIndex] = player;
    saveData(playersData, PLAYERS_PATH);
    
    // Tạo embed thông báo
    const feedEmbed = new EmbedBuilder()
        .setTitle(evolved ? `✨ ${pet.name} đã tiến hóa!` : `🍖 Cho ${pet.name} ăn thành công`)
        .setDescription(evolved ? 
            `**${pet.name}** đã tiến hóa lên cấp độ **${pet.level}**!\n\n**HP mới:** ${pet.hp}\n**Giai đoạn tiến hóa:** ${pet.evolution.stage}` : 
            `**${pet.name}** đã nhận được **${food.evolvePower}** điểm tiến hóa!\n\n**Tiến độ:** ${pet.evolution.points}/${pet.evolution.maxPoints} điểm\n**Cần thêm:** ${pet.evolution.maxPoints - pet.evolution.points} điểm để tiến hóa`)
        .setColor(evolved ? '#f1c40f' : '#2ecc71')
        .setFooter({ text: 'Yuri Garden' });
    
    // Tạo nút "Cho ăn tiếp" nếu người chơi còn thức ăn
    let components = [];
    if (player.inventory.food.length > 0) {
        const feedAgainButton = new ButtonBuilder()
            .setCustomId(`feed_again_${petId}`)
            .setLabel('Cho ăn tiếp')
            .setStyle(ButtonStyle.Primary);
            
        const row = new ActionRowBuilder().addComponents(feedAgainButton);
        components.push(row);
    }
    
    const message = await interaction.reply({ embeds: [feedEmbed], components, fetchReply: true });
    
    // Nếu có nút "Cho ăn tiếp", tạo collector
    if (components.length > 0) {
        const filter = i => {
            return i.customId === `feed_again_${petId}` && i.user.id === interaction.user.id;
        };
        
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });
        
        collector.on('collect', async i => {
            // Hiển thị một menu dropdown với các loại thức ăn có sẵn
            const updatedPlayer = getPlayerData(interaction.user.id);
            
            if (updatedPlayer.inventory.food.length === 0) {
                return await i.reply({ content: 'Bạn không còn thức ăn nào trong túi đồ!', ephemeral: true });
            }
            
            // Tạo embed mới để hiển thị các loại thức ăn
            const foodEmbed = new EmbedBuilder()
                .setTitle(`🍖 Chọn thức ăn cho ${newName}`)
                .setDescription(`Hãy chọn loại thức ăn bạn muốn dùng:`)
                .setColor('#3498db')
                .setFooter({ text: 'Yuri Garden' });
                
            updatedPlayer.inventory.food.forEach((food, index) => {
                foodEmbed.addFields({
                    name: `${index + 1}. ${food.name} (${food.amount}x)`,
                    value: `Tăng ${food.evolvePower} điểm tiến hóa`,
                    inline: true
                });
            });
            
            // Tạo các nút cho từng loại thức ăn
            const foodButtons = updatedPlayer.inventory.food.map((food) => {
                return new ButtonBuilder()
                    .setCustomId(`select_food_${petId}_${food.id}`)
                    .setLabel(food.name)
                    .setStyle(ButtonStyle.Success);
            });
            
            // Chia thành các hàng, tối đa 3 nút mỗi hàng
            const foodRows = [];
            for (let i = 0; i < foodButtons.length; i += 3) {
                const row = new ActionRowBuilder().addComponents(foodButtons.slice(i, i + 3));
                foodRows.push(row);
            }
            
            await i.update({ embeds: [foodEmbed], components: foodRows });
            
            // Tạo collector mới cho các nút thức ăn
            const foodFilter = i => {
                return i.customId.startsWith(`select_food_${petId}_`) && i.user.id === interaction.user.id;
            };
            
            const foodCollector = message.createMessageComponentCollector({ filter: foodFilter, time: 60000 });
            
            foodCollector.on('collect', async i => {
                const selectedFoodId = i.customId.split('_')[3];
                
                // Thực hiện lệnh feed với thức ăn đã chọn
                const newInteraction = {
                    options: {
                        getString: (name) => {
                            if (name === 'pet_id') return petId;
                            if (name === 'food_id') return selectedFoodId;
                            return null;
                        }
                    },
                    user: interaction.user,
                    reply: i.update.bind(i),
                    editReply: i.update.bind(i)
                };
                
                await handleFeed(newInteraction);
                foodCollector.stop();
            });
            
            foodCollector.on('end', collected => {
                if (collected.size === 0) {
                    // Nếu không có thức ăn nào được chọn, quay lại màn hình feed
                    interaction.editReply({ embeds: [feedEmbed], components }).catch(console.error);
                }
            });
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                // Vô hiệu hóa nút khi hết thời gian
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(components[0].components[0]).setDisabled(true)
                );
                
                interaction.editReply({ components: [disabledRow] }).catch(console.error);
            }
        });
    }
}
