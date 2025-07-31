//Chỉ chạy lần đầu
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[CẢNH BÁO] Lệnh tại ${file} thiếu "data" hoặc "execute".`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Đang đăng ký (refresh) slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Slash commands đã được đăng ký thành công!');
  } catch (error) {
    console.error(error);
  }
})();
