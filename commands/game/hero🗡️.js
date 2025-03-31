const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');

// File paths
const MONSTER_PATH = path.join(__dirname, '../data/monster.json');
const HERO_PATH = path.join(__dirname, '../data/hero.json');
const PET_PATH = path.join(__dirname, '../data/pet.json');
const WEAPON_PATH = path.join(__dirname, '../data/chaosword.json');

// Helper functions
function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return {};
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
    }
}

function getRandomMonster() {
    const monsters = readJsonFile(MONSTER_PATH);
    const monsterKeys = Object.keys(monsters);
    const randomKey = monsterKeys[Math.floor(Math.random() * monsterKeys.length)];
    return { id: randomKey, ...monsters[randomKey] };
}

function getHero(userId) {
    const heroes = readJsonFile(HERO_PATH);
    return heroes[userId];
}

function saveHero(userId, heroData) {
    const heroes = readJsonFile(HERO_PATH);
    heroes[userId] = heroData;
    return writeJsonFile(HERO_PATH, heroes);
}

// Main command module
module.exports = {
    data: new SlashCommandBuilder()
        .setName('hero')
        .setDescription('Hero game commands')
        .addSubcommand(subcommand => 
            subcommand
                .setName('register')
                .setDescription('Register as a new hero with 1000 coins')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('shop')
                .setDescription('Access the shop to buy or sell items')
                .addStringOption(option => 
                    option.setName('action')
                        .setDescription('Choose what to do in the shop')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Buy Weapons', value: 'buy_weapons' },
                            { name: 'Buy Pets', value: 'buy_pets' },
                            { name: 'Sell Monsters', value: 'sell' }
                        )
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('hunt')
                .setDescription('Hunt monsters to earn rewards')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('status')
                .setDescription('Check your hero status')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('equip')
                .setDescription('Equip a weapon or pet')
                .addStringOption(option => 
                    option.setName('type')
                        .setDescription('Type of item to equip')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Weapon', value: 'weapon' },
                            { name: 'Pet', value: 'pet' }
                        )
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'register':
                await handleRegister(interaction, userId);
                break;
            case 'shop':
                const action = interaction.options.getString('action');
                await handleShop(interaction, userId, action);
                break;
            case 'hunt':
                await handleHunt(interaction, userId);
                break;
            case 'status':
                await handleStatus(interaction, userId);
                break;
            case 'equip':
                const type = interaction.options.getString('type');
                await handleEquip(interaction, userId, type);
                break;
        }
    },
};

async function handleRegister(interaction, userId) {
    const heroes = readJsonFile(HERO_PATH);
    
    if (heroes[userId]) {
        return interaction.reply({ content: 'Bạn đã đăng ký rồi!', ephemeral: true });
    }
    
    const newHero = {
        coins: 1000,
        inventory: {
            monsters: {},
            weapons: {},
            pets: {}
        },
        equippedWeapon: null,
        activePet: null,
        hunts: 0,
        createdAt: new Date().toISOString()
    };
    
    heroes[userId] = newHero;
    
    if (writeJsonFile(HERO_PATH, heroes)) {
        await interaction.reply(`🎉 Đăng ký thành công! Bạn đã nhận được 1000 coins. Sử dụng /hero shop để mua vũ khí và pet.`);
    } else {
        await interaction.reply({ content: 'Có lỗi xảy ra khi đăng ký.', ephemeral: true });
    }
}

async function handleShop(interaction, userId, action) {
    const hero = getHero(userId);
    
    if (!hero) {
        return interaction.reply({ content: 'Bạn cần đăng ký trước! Sử dụng lệnh /hero register', ephemeral: true });
    }
    
    if (action === 'buy_weapons') {
        await handleBuyWeapons(interaction, userId, hero);
    } else if (action === 'buy_pets') {
        await handleBuyPets(interaction, userId, hero);
    } else if (action === 'sell') {
        await handleSellMonsters(interaction, userId, hero);
    }
}

async function handleBuyPets(interaction, userId, hero) {
    const pets = readJsonFile(PET_PATH);
    
    if (Object.keys(pets).length === 0) {
        return interaction.reply({ content: 'Không có pet nào trong cửa hàng!', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🐾 Cửa hàng Pet')
        .setDescription(`Tiền hiện có: ${hero.coins} coins\nHãy nhập số thứ tự pet muốn mua.`)
        .setColor(0x00ff99);
    
    // Display pets as numbered list instead of buttons
    let index = 1;
    const petOptions = [];
    
    // To handle Discord's embed field limit (max 25 fields)
    const PETS_PER_PAGE = 10;
    const totalPets = Object.keys(pets).length;
    const petsArray = Object.entries(pets);
    
    // Show only the first page of pets
    const petEntries = petsArray.slice(0, PETS_PER_PAGE);
    
    for (const [petId, pet] of petEntries) {
        let buffDescription = '';
        if (pet.buff.type === 'damage_reduction') {
            buffDescription = `Giảm ${pet.buff.value}% sát thương từ quái vật`;
        } else if (pet.buff.type === 'monster_multiplier') {
            buffDescription = `Tăng ${pet.buff.value}x số lượng quái vật khi săn`;
        } else if (pet.buff.type === 'coin_bonus') {
            buffDescription = `Tăng ${pet.buff.value}% số coins khi bán quái vật`;
        }
        
        petOptions.push({ id: petId, name: pet.name, index: index, buff: buffDescription, imageUrl: pet.imageUrl });
        
        embed.addFields({
            name: `${index}. ${pet.name} - ${pet.price} coins`,
            value: `${pet.description}\nBuff: ${buffDescription}`,
            inline: false
        });
        
        index++;
    }
    
    // Display pagination info if needed
    if (totalPets > PETS_PER_PAGE) {
        embed.setFooter({ text: `Hiển thị 1-${petEntries.length} của ${totalPets} pet` });
    }
    
    // Show a random pet image as preview
    if (petEntries.length > 0) {
        const randomPet = petEntries[Math.floor(Math.random() * petEntries.length)][1];
        if (randomPet.imageUrl) {
            embed.setImage(randomPet.imageUrl);
        }
    }
    
    await interaction.reply({ 
        content: 'Hãy nhập số thứ tự pet bạn muốn mua:', 
        embeds: [embed],
        // Use flags instead of ephemeral
        flags: interaction.ephemeral ? 64 : 0
    });
    
    const filter = m => m.author.id === userId && !isNaN(m.content) && Number(m.content) > 0 && Number(m.content) <= petOptions.length;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
    
    collector.on('collect', async message => {
        const choice = parseInt(message.content);
        const selectedPet = petOptions[choice - 1];
        const petId = selectedPet.id;
        const pet = pets[petId];
        
        if (!pet) {
            return interaction.followUp('Pet không tồn tại!');
        }
        
        if (hero.coins < pet.price) {
            return interaction.followUp('Bạn không đủ coins để mua pet này!');
        }
        
        // Update hero data
        hero.coins -= pet.price;
        if (!hero.inventory.pets) {
            hero.inventory.pets = {};
        }
        if (!hero.inventory.pets[petId]) {
            hero.inventory.pets[petId] = 0;
        }
        hero.inventory.pets[petId]++;
        
        if (saveHero(userId, hero)) {
            let buffDescription = '';
            if (pet.buff.type === 'damage_reduction') {
                buffDescription = `Giảm ${pet.buff.value}% sát thương từ quái vật`;
            } else if (pet.buff.type === 'monster_multiplier') {
                buffDescription = `Tăng ${pet.buff.value}x số lượng quái vật khi săn`;
            } else if (pet.buff.type === 'coin_bonus') {
                buffDescription = `Tăng ${pet.buff.value}% số coins khi bán quái vật`;
            }
            
            const responseEmbed = new EmbedBuilder()
                .setTitle(`Mua Pet Thành Công: ${pet.name}`)
                .setDescription(`Bạn đã mua thành công ${pet.name}!\nCòn lại: ${hero.coins} coins`)
                .addFields(
                    { name: 'Mô tả', value: pet.description, inline: false },
                    { name: 'Khả năng đặc biệt', value: buffDescription, inline: false },
                    { name: 'Số lượng sở hữu', value: `${hero.inventory.pets[petId]} con`, inline: true }
                )
                .setColor(0x00ff99);
            
            if (pet.imageUrl) {
                responseEmbed.setImage(pet.imageUrl);
            }
            
            await interaction.followUp({ embeds: [responseEmbed] });
        } else {
            await interaction.followUp('Có lỗi xảy ra khi mua pet.');
        }
    });
    
    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.followUp('Hết thời gian lựa chọn.');
        }
    });
}


async function handleBuyWeapons(interaction, userId, hero) {
    const weapons = readJsonFile(WEAPON_PATH);
    
    if (Object.keys(weapons).length === 0) {
        return interaction.reply({ content: 'Không có vũ khí nào trong cửa hàng!', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🗡️ Cửa hàng Vũ khí')
        .setDescription(`Tiền hiện có: ${hero.coins} coins\nHãy nhập số thứ tự vũ khí muốn mua.`)
        .setColor(0x0099ff);
    
    // Display weapons as numbered list instead of buttons
    let index = 1;
    const weaponOptions = [];
    
    for (const [weaponId, weapon] of Object.entries(weapons)) {
        weaponOptions.push({ id: weaponId, name: weapon.name, index: index });
        
        embed.addFields({
            name: `${index}. ${weapon.name} - ${weapon.price} coins`,
            value: `Sức mạnh: ${weapon.power} | ${weapon.description}`,
            inline: false
        });
        
        index++;
    }
    
    await interaction.reply({ 
        content: 'Hãy nhập số thứ tự vũ khí bạn muốn mua:', 
        embeds: [embed]
    });
    
    const filter = m => m.author.id === userId && !isNaN(m.content) && Number(m.content) > 0 && Number(m.content) <= weaponOptions.length;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
    
    collector.on('collect', async message => {
        const choice = parseInt(message.content);
        const selectedWeapon = weaponOptions[choice - 1];
        const weaponId = selectedWeapon.id;
        const weapon = weapons[weaponId];
        
        if (!weapon) {
            return interaction.followUp('Vũ khí không tồn tại!');
        }
        
        if (hero.coins < weapon.price) {
            return interaction.followUp('Bạn không đủ coins để mua vũ khí này!');
        }
        
        // Update hero data
        hero.coins -= weapon.price;
        if (!hero.inventory.weapons[weaponId]) {
            hero.inventory.weapons[weaponId] = 0;
        }
        hero.inventory.weapons[weaponId]++;
        
        if (saveHero(userId, hero)) {
            const responseEmbed = new EmbedBuilder()
                .setTitle(`Mua Vũ Khí Thành Công: ${weapon.name}`)
                .setDescription(`Bạn đã mua thành công ${weapon.name}! Còn lại ${hero.coins} coins.`)
                .setColor(0x0099ff);
            
            if (weapon.imageUrl) {
                responseEmbed.setImage(weapon.imageUrl);
            }
            
            await interaction.followUp({ embeds: [responseEmbed] });
        } else {
            await interaction.followUp('Có lỗi xảy ra khi mua vũ khí.');
        }
    });
    
    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.followUp('Hết thời gian lựa chọn.');
        }
    });
}

async function handleSellMonsters(interaction, userId, hero) {
    const monsters = readJsonFile(MONSTER_PATH);
    
    if (!hero.inventory.monsters || Object.keys(hero.inventory.monsters).length === 0) {
        return interaction.reply({ content: 'Bạn không có quái vật nào để bán!', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('💰 Bán Quái Vật')
        .setDescription(`Tiền hiện có: ${hero.coins} coins`)
        .setColor(0xffd700);
    
    let hasMonsters = false;
    
    for (const [monsterId, quantity] of Object.entries(hero.inventory.monsters)) {
        if (quantity > 0 && monsters[monsterId]) {
            hasMonsters = true;
            const sellPrice = monsters[monsterId].value || 0;
            const totalPrice = sellPrice * quantity;
            
            embed.addFields({
                name: `${monsters[monsterId].name} x${quantity}`,
                value: `Giá bán: ${sellPrice} coins/con (Tổng: ${totalPrice} coins)`,
                inline: false
            });
        }
    }
    
    if (!hasMonsters) {
        return interaction.reply({ content: 'Bạn không có quái vật nào để bán!', ephemeral: true });
    }
    
    const row = new ActionRowBuilder();
    
    Object.entries(hero.inventory.monsters).forEach(([monsterId, quantity], index) => {
        if (index < 5 && quantity > 0 && monsters[monsterId]) { // Discord limits 5 buttons per row
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`sell_monster_${monsterId}`)
                    .setLabel(monsters[monsterId].name)
                    .setStyle(ButtonStyle.Danger)
            );
        }
    });
    
    await interaction.reply({ 
        content: 'Chọn quái vật bạn muốn bán:', 
        embeds: [embed],
        components: [row],
        fetchReply: true
    });
    
    const filter = i => i.user.id === userId && i.customId.startsWith('sell_monster_');
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
    
    collector.on('collect', async i => {
        const monsterId = i.customId.replace('sell_monster_', '');
        
        if (!hero.inventory.monsters[monsterId] || hero.inventory.monsters[monsterId] <= 0) {
            return i.update({ content: 'Bạn không có quái vật này để bán!', components: [] });
        }
        
        const monster = monsters[monsterId];
        const quantity = hero.inventory.monsters[monsterId];
        const sellPrice = monster.value || 0;
        const totalPrice = sellPrice * quantity;
        
        // Apply pet bonus if applicable
        let finalPrice = totalPrice;
        if (hero.activePet) {
            const pets = readJsonFile(PET_PATH);
            const activePet = pets[hero.activePet];
            if (activePet && activePet.buff.type === 'coin_bonus') {
                const bonus = totalPrice * (activePet.buff.value / 100);
                finalPrice = totalPrice + bonus;
            }
        }
        
        // Update hero data
        hero.coins += finalPrice;
        hero.inventory.monsters[monsterId] = 0;
        
        if (saveHero(userId, hero)) {
            await i.update({ 
                content: `Bạn đã bán ${quantity} ${monster.name} và nhận được ${finalPrice} coins! Hiện tại có ${hero.coins} coins.`,
                components: []
            });
        } else {
            await i.update({ 
                content: 'Có lỗi xảy ra khi bán quái vật.',
                components: []
            });
        }
    });
    
    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.editReply({ content: 'Hết thời gian lựa chọn.', components: [] });
        }
    });
}

async function handleHunt(interaction, userId) {
    const hero = getHero(userId);
    
    if (!hero) {
        return interaction.reply({ content: 'Bạn cần đăng ký trước! Sử dụng lệnh /hero register', ephemeral: true });
    }
    
    // Check if hero has a weapon equipped
    if (!hero.equippedWeapon) {
        return interaction.reply({ content: 'Bạn cần trang bị vũ khí trước khi đi săn! Sử dụng lệnh /hero equip', ephemeral: true });
    }
    
    const monster = getRandomMonster();
    
    if (!monster) {
        return interaction.reply({ content: 'Không tìm thấy quái vật nào để săn!', ephemeral: true });
    }
    
    // Determine success based on weapon power and monster difficulty
    const weapons = readJsonFile(WEAPON_PATH);
    const weaponPower = weapons[hero.equippedWeapon]?.power || 1;
    const monsterDifficulty = monster.difficulty || 1;
    
    const successChance = 0.5 + (0.1 * (weaponPower - monsterDifficulty));
    const success = Math.random() < Math.min(0.95, Math.max(0.05, successChance));
    
    // Calculate damage taken
    let damageReduction = 0;
    if (hero.activePet) {
        const pets = readJsonFile(PET_PATH);
        const activePet = pets[hero.activePet];
        if (activePet && activePet.buff.type === 'damage_reduction') {
            damageReduction = activePet.buff.value || 0;
        }
    }
    
    const baseDamage = success ? monster.damage * 0.5 : monster.damage;
    const finalDamage = Math.max(0, baseDamage * (1 - (damageReduction / 100)));
    
    // Update hero inventory if successful
    if (success) {
        // Determine monster quantity (affected by pet)
        let monsterQuantity = 1;
        if (hero.activePet) {
            const pets = readJsonFile(PET_PATH);
            const activePet = pets[hero.activePet];
            if (activePet && activePet.buff.type === 'monster_multiplier') {
                monsterQuantity = Math.max(1, Math.floor(1 * activePet.buff.value));
            }
        }
        
        if (!hero.inventory.monsters[monster.id]) {
            hero.inventory.monsters[monster.id] = 0;
        }
        hero.inventory.monsters[monster.id] += monsterQuantity;
        hero.hunts++;
        
        saveHero(userId, hero);
        
        const embed = new EmbedBuilder()
            .setTitle(`🎯 Săn quái vật thành công!`)
            .setDescription(`Bạn đã săn được ${monsterQuantity} con ${monster.name}!`)
            .addFields(
                { name: 'Thông tin quái vật', value: monster.description || 'Không có mô tả' },
                { name: 'Sát thương nhận', value: `${finalDamage.toFixed(1)} (Giảm ${damageReduction}%)` },
                { name: 'Giá trị', value: `${monster.value || 0} coins/con` }
            )
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed] });
    } else {
        hero.hunts++;
        saveHero(userId, hero);
        
        const embed = new EmbedBuilder()
            .setTitle(`❌ Săn quái vật thất bại!`)
            .setDescription(`Bạn không thể săn được ${monster.name}.`)
            .addFields({ name: 'Sát thương nhận', value: `${finalDamage.toFixed(1)} (Giảm ${damageReduction}%)` })
            .setColor(0xff0000);
        
        await interaction.reply({ embeds: [embed] });
    }
}

async function handleStatus(interaction, userId) {
    const hero = getHero(userId);
    
    if (!hero) {
        return interaction.reply({ content: 'Bạn cần đăng ký trước! Sử dụng lệnh /hero register', ephemeral: true });
    }
    
    // Get equipped items information
    let weaponInfo = 'Không có';
    if (hero.equippedWeapon) {
        const weapons = readJsonFile(WEAPON_PATH);
        const weapon = weapons[hero.equippedWeapon];
        if (weapon) {
            weaponInfo = `${weapon.name} (Sức mạnh: ${weapon.power})`;
        }
    }
    
    let petInfo = 'Không có';
    if (hero.activePet) {
        const pets = readJsonFile(PET_PATH);
        const pet = pets[hero.activePet];
        if (pet) {
            let buffInfo = '';
            if (pet.buff.type === 'damage_reduction') {
                buffInfo = `Giảm ${pet.buff.value}% sát thương`;
            } else if (pet.buff.type === 'monster_multiplier') {
                buffInfo = `Tăng ${pet.buff.value}x số lượng quái vật`;
            } else if (pet.buff.type === 'coin_bonus') {
                buffInfo = `Tăng ${pet.buff.value}% coins khi bán`;
            }
            petInfo = `${pet.name} (${buffInfo})`;
        }
    }
    
    // Count inventory items
    const weaponCount = Object.values(hero.inventory.weapons || {}).reduce((sum, count) => sum + count, 0);
    const petCount = Object.values(hero.inventory.pets || {}).reduce((sum, count) => sum + count, 0);
    const monsterCount = Object.values(hero.inventory.monsters || {}).reduce((sum, count) => sum + count, 0);
    
    const embed = new EmbedBuilder()
        .setTitle(`🦸 Thông tin Hero`)
        .setColor(0x0099ff)
        .addFields(
            { name: 'Coins', value: `${hero.coins}`, inline: true },
            { name: 'Số lần đi săn', value: `${hero.hunts}`, inline: true },
            { name: 'Vũ khí đang dùng', value: weaponInfo, inline: false },
            { name: 'Pet đang dùng', value: petInfo, inline: false },
            { name: 'Kho đồ', value: `Vũ khí: ${weaponCount} | Pet: ${petCount} | Quái vật: ${monsterCount}`, inline: false }
        )
        .setFooter({ text: `Đăng ký từ: ${new Date(hero.createdAt).toLocaleDateString()}` });
    
    await interaction.reply({ embeds: [embed] });
}

async function handleEquip(interaction, userId, type) {
    const hero = getHero(userId);
    
    if (!hero) {
        return interaction.reply({ content: 'Bạn cần đăng ký trước! Sử dụng lệnh /hero register', ephemeral: true });
    }
    
    if (type === 'weapon') {
        if (!hero.inventory.weapons || Object.keys(hero.inventory.weapons).length === 0) {
            return interaction.reply({ content: 'Bạn không có vũ khí nào để trang bị!', ephemeral: true });
        }
        
        const weapons = readJsonFile(WEAPON_PATH);
        const embed = new EmbedBuilder()
            .setTitle('🗡️ Trang bị Vũ khí')
            .setColor(0x0099ff);
        
        let hasWeapons = false;
        
        for (const [weaponId, quantity] of Object.entries(hero.inventory.weapons)) {
            if (quantity > 0 && weapons[weaponId]) {
                hasWeapons = true;
                embed.addFields({
                    name: `${weapons[weaponId].name} x${quantity}`,
                    value: `Sức mạnh: ${weapons[weaponId].power} | ${weapons[weaponId].description}`,
                    inline: false
                });
            }
        }
        
        if (!hasWeapons) {
            return interaction.reply({ content: 'Bạn không có vũ khí nào để trang bị!', ephemeral: true });
        }
        
        const row = new ActionRowBuilder();
        
        Object.entries(hero.inventory.weapons).forEach(([weaponId, quantity], index) => {
            if (index < 5 && quantity > 0 && weapons[weaponId]) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`equip_weapon_${weaponId}`)
                        .setLabel(weapons[weaponId].name)
                        .setStyle(ButtonStyle.Primary)
                );
            }
        });
        
        await interaction.reply({ 
            content: 'Chọn vũ khí bạn muốn trang bị:', 
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
        
        const filter = i => i.user.id === userId && i.customId.startsWith('equip_weapon_');
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
        
        collector.on('collect', async i => {
            const weaponId = i.customId.replace('equip_weapon_', '');
            
            if (!hero.inventory.weapons[weaponId] || hero.inventory.weapons[weaponId] <= 0) {
                return i.update({ content: 'Bạn không có vũ khí này để trang bị!', components: [] });
            }
            
            hero.equippedWeapon = weaponId;
            
            if (saveHero(userId, hero)) {
                await i.update({ 
                    content: `Bạn đã trang bị ${weapons[weaponId].name}!`,
                    components: []
                });
            } else {
                await i.update({ 
                    content: 'Có lỗi xảy ra khi trang bị vũ khí.',
                    components: []
                });
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'Hết thời gian lựa chọn.', components: [] });
            }
        });
    } else if (type === 'pet') {
        if (!hero.inventory.pets || Object.keys(hero.inventory.pets).length === 0) {
            return interaction.reply({ content: 'Bạn không có pet nào để trang bị!', ephemeral: true });
        }
        
        const pets = readJsonFile(PET_PATH);
        const embed = new EmbedBuilder()
            .setTitle('🐾 Trang bị Pet')
            .setColor(0x00ff99);
        
        let hasPets = false;
        
        for (const [petId, quantity] of Object.entries(hero.inventory.pets)) {
            if (quantity > 0 && pets[petId]) {
                hasPets = true;
                
                let buffDescription = '';
                if (pets[petId].buff.type === 'damage_reduction') {
                    buffDescription = `Giảm ${pets[petId].buff.value}% sát thương từ quái vật`;
                } else if (pets[petId].buff.type === 'monster_multiplier') {
                    buffDescription = `Tăng ${pets[petId].buff.value}x số lượng quái vật khi săn`;
                } else if (pets[petId].buff.type === 'coin_bonus') {
                    buffDescription = `Tăng ${pets[petId].buff.value}% số coins khi bán quái vật`;
                }
                
                embed.addFields({
                    name: `${pets[petId].name} x${quantity}`,
                    value: `${pets[petId].description}\nBuff: ${buffDescription}`,
                    inline: false
                });
            }
        }
        
        if (!hasPets) {
            return interaction.reply({ content: 'Bạn không có pet nào để trang bị!', ephemeral: true });
        }
        
        const row = new ActionRowBuilder();
        
        Object.entries(hero.inventory.pets).forEach(([petId, quantity], index) => {
            if (index < 5 && quantity > 0 && pets[petId]) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`equip_pet_${petId}`)
                        .setLabel(pets[petId].name)
                        .setStyle(ButtonStyle.Success)
                );
            }
        });
        
        await interaction.reply({ 
            content: 'Chọn pet bạn muốn trang bị:', 
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
        
        const filter = i => i.user.id === userId && i.customId.startsWith('equip_pet_');
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
        
        collector.on('collect', async i => {
            const petId = i.customId.replace('equip_pet_', '');
            
            if (!hero.inventory.pets[petId] || hero.inventory.pets[petId] <= 0) {
                return i.update({ content: 'Bạn không có pet này để trang bị!', components: [] });
            }
            
            hero.activePet = petId;
            
            if (saveHero(userId, hero)) {
                await i.update({ 
                    content: `Bạn đã trang bị ${pets[petId].name}!`,
                    components: []
                });
            } else {
                await i.update({ 
                    content: 'Có lỗi xảy ra khi trang bị pet.',
                    components: []
                });
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'Hết thời gian lựa chọn.', components: [] });
            }
        });
    }
}
