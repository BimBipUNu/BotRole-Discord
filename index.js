//login bot
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const token = process.env.TOKEN;

// Tạo client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Tạo collection để lưu các lệnh
client.commands = new Collection();
// Load các file lệnh
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[CẢNH BÁO] Lệnh tại ${filePath} thiếu "data" hoặc "execute".`);
  }
}

// Sự kiện khi người dùng gọi slash command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`Lệnh ${interaction.commandName} không tồn tại.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Lỗi khi thực thi lệnh ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'Có lỗi xảy ra khi chạy lệnh.', ephemeral: true });
  }
});

// Sự kiện khi bot online
client.once(Events.ClientReady, readyClient => {
  console.log(`Bot đã sẵn sàng! Đăng nhập với ${readyClient.user.tag}`);
});

// Đăng nhập bot
client.login(token);

// setInterval(() => {
//   const used = process.memoryUsage();
//   console.clear();
//   console.log('Heap Used:', (used.heapUsed / 1024 / 1024).toFixed(2), 'MB');
//   console.log('RSS:', (used.rss / 1024 / 1024).toFixed(2), 'MB');
// }, 1000); // log mỗi giây
