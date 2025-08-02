module.exports = {
    name: "Defauld Role",
    async execute (member) {
        const defaultRole = "Người mới";
        const role = member.guild.roles.cache.find(r => r.name == defaultRole);

        if(!role){
            console.log(`Không tìm thấy ${defaultRole}`);
            return;
        }

        try {
            await member.roles.add(role);
            console.log(`Đã gán role mặc định cho người dùng ${member.name} thành công`);
        }catch(error){
            console.error(`Không thể gán role cho người dùng ${mmember.name}`);
        }
    }
}
