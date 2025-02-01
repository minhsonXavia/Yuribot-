const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giaiptb2')
        .setDescription('Giải phương trình bậc 2 dạng ax² + bx + c = 0')
        .addNumberOption(option => option.setName('a').setDescription('Hệ số a').setRequired(true))
        .addNumberOption(option => option.setName('b').setDescription('Hệ số b').setRequired(true))
        .addNumberOption(option => option.setName('c').setDescription('Hệ số c').setRequired(true)),

    async execute(interaction) {
        const a = interaction.options.getNumber('a');
        const b = interaction.options.getNumber('b');
        const c = interaction.options.getNumber('c');

        await interaction.reply(`📌 Giải phương trình: **${a}x² + ${b}x + ${c} = 0**`);

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        await delay(1000); // Chờ 1 giây để tạo hiệu ứng

        if (a === 0) {
            if (b === 0) {
                return interaction.followUp(c === 0 ? "♾️ Phương trình có vô số nghiệm" : "❌ Phương trình vô nghiệm");
            } else {
                return interaction.followUp(`✅ Nghiệm của phương trình: **x = ${-c / b}**`);
            }
        }

        let delta = b * b - 4 * a * c;
        await interaction.followUp(`🔍 Tính delta: **Δ = ${delta}**`);

        await delay(1000); // Chờ 1 giây

        if (delta < 0) {
            return interaction.followUp("🪦===𝐏𝐞́ 𝐘𝐮𝐫𝐢 𝐡𝐚̆𝐦 𝐭𝐢́𝐧𝐡 𝐝𝐮̛𝐨̛̣𝐜, 𝐚𝐢 𝐤𝐞̂𝐮 𝐧𝐨́ 𝐯𝐨̂ 𝐧𝐠𝐡𝐢𝐞̣̂𝐦===😿(Δ < 0)");
        } else if (delta === 0) {
            let x = -b / (2 * a);
            return interaction.followUp("👨‍🔬━━━━𝐏𝐞́ 𝐭𝐡𝐚̂́𝐲 𝐜𝐨́𝐚 𝐧𝐠𝐡𝐢𝐞̣̂𝐦 𝐤𝐞́𝐩 𝐚́ 𝐚𝐢𝐮━━━━: **x₁ = x₂ = ${x}**`);
        } else {
            let x1 = (-b + Math.sqrt(delta)) / (2 * a);
            let x2 = (-b - Math.sqrt(delta)) / (2 * a);
            return interaction.followUp(`✅ ┊𝐏𝐡𝐮̛𝐨̛𝐧𝐠 𝐭𝐫𝐢̀𝐧𝐡 𝐜𝐨́ 𝐡𝐚𝐢 𝐧𝐠𝐡𝐢𝐞̣̂𝐦ツ┊: **x₁ = ${x1}**, **x₂ = ${x2}**`);
        }
    }
};

