const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Trả về Pong!'),
  async execute(interaction) {
    await interaction.reply({
      content: '🏓 Pong!',
      ephemeral: true,
    });
  },
};
