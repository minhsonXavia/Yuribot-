
const { Events } = require('discord.js');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');


const rainbow = [
  chalk.redBright,
  chalk.keyword('orange'),
  chalk.yellowBright,
  chalk.greenBright,
  chalk.cyanBright,
  chalk.blueBright,
  chalk.magentaBright
];


const bannerLines = [
  '███╗░░░███╗██╗███╗░░██╗██╗░░██╗░██████╗░█████╗░███╗░░██╗███╗░░██╗',
  '████╗░████║██║████╗░██║██║░░██║██╔════╝██╔══██╗████╗░██║████╗░██║',
  '██╔████╔██║██║██╔██╗██║███████║╚█████╗░██║░░██║██╔██╗██║██╔██╗██║',
  '██║╚██╔╝██║██║██║╚████║██╔══██║░╚═══██╗██║░░██║██║╚████║██║╚████║',
  '██║░╚═╝░██║██║██║░╚███║██║░░██║██████╔╝╚█████╔╝██║░╚███║██║░╚███║',
  '╚═╝░░░░░╚═╝╚═╝╚═╝░░╚══╝╚═╝░░╚═╝╚═════╝░░╚════╝░╚═╝░░╚══╝╚═╝░░╚══╝'
];

function clearTempFolder(tempPath) {
  if (!fs.existsSync(tempPath)) return;
  fs.readdirSync(tempPath).forEach(file => {
    const fullPath = path.join(tempPath, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  });
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.clear(); // 

    
    console.log('\n');
    bannerLines.forEach((line, index) => {
      const colorFn = rainbow[index % rainbow.length];
      console.log(colorFn(line));
    });

    // Clear /temp folder
    const tempDir = path.join(__dirname, '..', 'temp');
    clearTempFolder(tempDir);

    // Ready log
    console.log(chalk.greenBright(`\n✅ Anh đã onl với tên ${client.user.tag}!`));
  },
};
