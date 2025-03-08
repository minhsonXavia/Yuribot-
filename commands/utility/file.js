const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ADMIN_ID = "1306552024568959016"; // Thay ID của bạn vào đây

module.exports = {
    data: new SlashCommandBuilder()
        .setName('file')
        .setDescription('Quản lý file & thư mục')
        .addStringOption(option => 
            option.setName('action')
                .setDescription('Hành động (open, send, del, view, create, zip, copy, rename)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('path')
                .setDescription('Đường dẫn thư mục hoặc file')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('newname')
                .setDescription('Tên mới (chỉ dùng cho rename)')
                .setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '❌ Bạn không có quyền sử dụng lệnh này!', ephemeral: true });
        }

        const action = interaction.options.getString('action');
        const filePath = interaction.options.getString('path') || process.cwd();
        const newName = interaction.options.getString('newname');

        try {
            switch (action) {
                case 'open': {
                    if (!fs.existsSync(filePath)) return interaction.reply('❌ Đường dẫn không tồn tại!');
                    const items = fs.readdirSync(filePath).map(item => {
                        const fullPath = path.join(filePath, item);
                        const stats = fs.statSync(fullPath);
                        return `${stats.isDirectory() ? '📂' : '📄'} ${item} (${convertBytes(stats.size)})`;
                    }).join('\n');

                    return interaction.reply(`📂 **Danh sách file/thư mục:**\n${items || 'Thư mục trống'}`);
                }

                case 'del': {
                    if (!fs.existsSync(filePath)) return interaction.reply('❌ Đường dẫn không tồn tại!');
                    if (fs.statSync(filePath).isDirectory()) {
                        fs.rmdirSync(filePath, { recursive: true });
                        return interaction.reply(`✅ Đã xoá thư mục: ${filePath}`);
                    } else {
                        fs.unlinkSync(filePath);
                        return interaction.reply(`✅ Đã xoá file: ${filePath}`);
                    }
                }

                case 'send': {
                    if (!fs.existsSync(filePath)) return interaction.reply('❌ File không tồn tại!');
                    return interaction.reply({ files: [filePath] });
                }

                case 'view': {
                    if (!fs.existsSync(filePath)) return interaction.reply('❌ File không tồn tại!');
                    const content = fs.readFileSync(filePath, 'utf8');
                    return interaction.reply(`📄 Nội dung file:\n\`\`\`${content.substring(0, 2000)}\`\`\``);
                }

                case 'create': {
                    if (filePath.endsWith('/')) {
                        fs.mkdirSync(filePath, { recursive: true });
                        return interaction.reply(`✅ Đã tạo thư mục: ${filePath}`);
                    } else {
                        fs.writeFileSync(filePath, '');
                        return interaction.reply(`✅ Đã tạo file: ${filePath}`);
                    }
                }

                case 'copy': {
                    const newFilePath = filePath.replace(/(\.[^/.]+)?$/, '_copy$1');
                    fs.copyFileSync(filePath, newFilePath);
                    return interaction.reply(`✅ Đã sao chép file thành: ${newFilePath}`);
                }

                case 'rename': {
                    if (!newName) return interaction.reply('❌ Cần nhập tên mới!');
                    const newPath = path.join(path.dirname(filePath), newName);
                    fs.renameSync(filePath, newPath);
                    return interaction.reply(`✅ Đã đổi tên file thành: ${newName}`);
                }

                case 'zip': {
                    const zipFile = `${filePath}.zip`;
                    await zipFiles([filePath], zipFile);
                    return interaction.reply({ content: `✅ Đã nén file:\n${zipFile}`, files: [zipFile] });
                }

                default:
                    return interaction.reply('❌ Hành động không hợp lệ!');
            }
        } catch (error) {
            console.error(error);
            return interaction.reply(`❌ Đã xảy ra lỗi: ${error.message}`);
        }
    }
};

// Hàm chuyển đổi kích thước file
function convertBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Hàm nén file/thư mục
async function zipFiles(sourcePaths, outputPath) {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    sourcePaths.forEach(srcPath => {
        if (fs.statSync(srcPath).isFile()) {
            archive.file(srcPath, { name: path.basename(srcPath) });
        } else {
            archive.directory(srcPath, path.basename(srcPath));
        }
    });

    await archive.finalize();
}
