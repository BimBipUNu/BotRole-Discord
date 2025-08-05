const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Đăng ký vai trò người dùng từ Google Sheet')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Tên của bạn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Chọn vai trò')
                .setRequired(true)
                .addChoices(
                    { name: 'K24', value: 'K24' },
                    { name: 'GV', value: 'GV' },
                    { name: 'CTSV', value: 'CTSV' }
                )),

    async execute(interaction) {
        const name = interaction.options.getString('name').trim();
        const roleInput = interaction.options.getString('role');
        const roleMap = {
            K24: "K24",
            GV: "Giáo viên",
            CTSV: "Công tác sinh viên"
        };
        const roleNameOnDiscord = roleMap[roleInput];

        try {
            await interaction.deferReply({ flags: 64 });

            // Xác thực Google Sheets
            const auth = new google.auth.GoogleAuth({
                keyFile: path.join(__dirname, '../google-credentials.json'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const client = await auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: client });

            const spreadsheetId = process.env.SHEET_ID;
            const range = 'Sheet1!A2:E1000';

            const res = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            const rows = res.data.values;

            if (!rows || rows.length === 0) {
                return interaction.editReply('Không có dữ liệu trong sheet.');
            }

            const rowIndex = rows.findIndex(row =>
                row[1]?.toLowerCase() === name.toLowerCase() &&
                row[2]?.toUpperCase() === roleInput.toUpperCase()
            );

            if (rowIndex === -1) {
                const nameMatch = rows.find(row => row[1]?.toLowerCase() === name.toLowerCase());
                if (!nameMatch) return interaction.editReply('Tên này không được đăng ký.');
                return interaction.editReply('Vai trò không đúng với thông tin đã đăng ký.');
            }

            const userRow = rows[rowIndex];
            const status = userRow[3]?.toLowerCase();

            if (status === 'đã thêm') {
                return interaction.editReply('Vai trò đã được gán từ trước.');
            }

            // Gán role
            const guild = interaction.guild;
            const roleToAssign = guild.roles.cache.find(r => r.name === roleNameOnDiscord);
            if (!roleToAssign) {
                return interaction.editReply('Role trên Discord không tồn tại.');
            }

            try {
                //Gán role mới và gỡ role mặc định
                await interaction.member.roles.add(roleToAssign);
                //Gỡ role mặc định
                const defaultRole = guild.roles.cache.find(r => r.name === 'Người mới');
                if (defaultRole && interaction.member.roles.cache.has(defaultRole.id)) {
                    try {
                        await interaction.member.roles.remove(defaultRole);
                    } catch (err) {
                        console.warn(`Không thể gỡ role "Người mới":`, err);
                    }
                }
            } catch (err) {
                return interaction.editReply('Không thể gán vai trò. Kiểm tra quyền của bot.');
            }

            // Cập nhật lại Google Sheet thành "đã thêm" Và lưu ID discord người đã được gán role
            const statusCol = 'D';
            const discordIdCol = 'E';
            const targetRow = rowIndex + 2; // vì dữ liệu bắt đầu từ hàng 2

            const updateRange = `Sheet1!${statusCol}${targetRow}:${discordIdCol}${targetRow}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: updateRange,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [['đã thêm', interaction.user.id]],
                },
            });


            await interaction.editReply(`Đã gán vai trò **${roleInput}** cho **${name}** thành công!`);
        } catch (error) {
            console.error('[LỖI BOT]:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Đã xảy ra lỗi không mong muốn.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Đã xảy ra lỗi không mong muốn.', ephemeral: true });
            }
        }
    }
};
