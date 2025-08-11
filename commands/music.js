const { SlashCommandBuilder } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const playdl = require('play-dl');

const queues = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Điều khiển phát nhạc')
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Phát nhạc từ YouTube / Spotify / SoundCloud')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('Link nhạc')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('skip')
                .setDescription('Bỏ qua bài hiện tại')
        )
        .addSubcommand(sub =>
            sub.setName('stop')
                .setDescription('Dừng nhạc và xóa hàng đợi')
        )
        .addSubcommand(sub =>
            sub.setName('clearqueue')
                .setDescription('Xóa toàn bộ hàng đợi nhưng không dừng bài hiện tại')
        )
        .addSubcommand(sub =>
            sub.setName('queue')
                .setDescription('Xem danh sách hàng đợi')
        )
        .addSubcommand(sub =>
            sub.setName('help')
                .setDescription('Hiển thị hướng dẫn các lệnh nhạc')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'play') {
            const url = interaction.options.getString('url');
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({ content: 'Bạn phải vào voice channel trước!', ephemeral: true });
            }

            await interaction.deferReply();

            if (!queues.has(guildId)) {
                queues.set(guildId, {
                    connection: null,
                    player: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } }),
                    songs: [],
                    playing: false
                });
            }

            const serverQueue = queues.get(guildId);
            serverQueue.songs.push(url);

            if (!serverQueue.playing) {
                try {
                    serverQueue.connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: guildId,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                    });

                    playSong(guildId, interaction);
                } catch (err) {
                    console.error(err);
                    queues.delete(guildId);
                    return interaction.editReply('❌ Không thể kết nối voice channel.');
                }
            } else {
                await interaction.editReply(`✅ Đã thêm vào hàng đợi: ${url}`);
            }
        }

        else if (subcommand === 'skip') {
            const serverQueue = queues.get(guildId);
            if (!serverQueue || !serverQueue.playing) {
                return interaction.reply({ content: 'Không có bài nào đang phát.', ephemeral: true });
            }
            serverQueue.player.stop();
            await interaction.reply('⏭ Đã bỏ qua bài hiện tại.');
        }

        else if (subcommand === 'stop') {
            const serverQueue = queues.get(guildId);
            if (!serverQueue) {
                return interaction.reply({ content: 'Không có nhạc để dừng.', ephemeral: true });
            }
            serverQueue.songs = [];
            serverQueue.player.stop();
            serverQueue.connection.destroy();
            queues.delete(guildId);
            await interaction.reply('🛑 Đã dừng phát nhạc và xóa hàng đợi.');
        }

        else if (subcommand === 'clearqueue') {
            const serverQueue = queues.get(guildId);
            if (!serverQueue || serverQueue.songs.length <= 1) {
                return interaction.reply({ content: 'Không có bài nào trong hàng đợi để xóa.', ephemeral: true });
            }
            serverQueue.songs = [serverQueue.songs[0]];
            await interaction.reply('🧹 Đã xóa toàn bộ hàng đợi (trừ bài hiện tại).');
        }

        else if (subcommand === 'queue') {
            const serverQueue = queues.get(guildId);
            if (!serverQueue || serverQueue.songs.length === 0) {
                return interaction.reply({ content: '📭 Hàng đợi trống.', ephemeral: true });
            }
            const list = serverQueue.songs.map((song, i) => `${i === 0 ? '🎵' : `${i}.`} ${song}`).join('\n');
            await interaction.reply(`📜 **Hàng đợi:**\n${list}`);
        }

        else if (subcommand === 'help') {
            await interaction.reply({
                content: `
🎶 **Hướng dẫn lệnh nhạc**:
- \`/music play <url>\` → Phát nhạc từ **YouTube**, **Spotify** hoặc **SoundCloud**
- \`/music skip\` → Bỏ qua bài hiện tại
- \`/music stop\` → Dừng nhạc & xóa hàng đợi
- \`/music clearqueue\` → Xóa toàn bộ hàng đợi, giữ bài đang phát
- \`/music queue\` → Xem danh sách bài trong hàng đợi
- \`/music help\` → Hiển thị hướng dẫn này
                `,
                ephemeral: true
            });
        }
    }
};

async function playSong(guildId, interaction) {
    const serverQueue = queues.get(guildId);
    const song = serverQueue.songs[0];

    if (!song) {
        serverQueue.playing = false;
        serverQueue.connection.destroy();
        queues.delete(guildId);
        return interaction.followUp('📭 Hàng đợi trống, bot rời kênh.');
    }

    try {
        const stream = await playdl.stream(song);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });

        serverQueue.player.play(resource);
        serverQueue.connection.subscribe(serverQueue.player);
        serverQueue.playing = true;

        await interaction.editReply(`🎵 Đang phát: ${song}`);

        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(guildId, interaction);
        });

    } catch (err) {
        console.error(err);
        serverQueue.songs.shift();
        playSong(guildId, interaction);
    }
}
