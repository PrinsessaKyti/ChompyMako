const { welcomeEmbed } = require('../utils/embeds');
const { getGuild } = require('../utils/database');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        try {
            // Get guild settings
            const guildData = getGuild(member.guild.id);
            
            // Check if welcome channel is set
            if (!guildData.welcomeChannel) {
                // Try to find a channel called "welcome" or similar
                const welcomeChannel = member.guild.channels.cache.find(channel => 
                    (channel.name.toLowerCase().includes('welcome') ||
                     channel.name.toLowerCase().includes('greet') ||
                     channel.name.toLowerCase() === 'general') && 
                    channel.isTextBased()
                );
                
                if (welcomeChannel) {
                    // Set this as the welcome channel for future use
                    const db = require('../utils/database');
                    db.updateGuild(member.guild.id, { welcomeChannel: welcomeChannel.id });
                    
                    // Send welcome message
                    const embed = welcomeEmbed(member, member.guild);
                    welcomeChannel.send({ embeds: [embed], content: `${member}` });
                }
            } else {
                // Get the channel from the stored ID
                const welcomeChannel = member.guild.channels.cache.get(guildData.welcomeChannel);
                
                if (welcomeChannel && welcomeChannel.isTextBased()) {
                    // Send welcome message
                    const embed = welcomeEmbed(member, member.guild);
                    welcomeChannel.send({ embeds: [embed], content: `${member}` });
                }
            }
            
            // Assign auto roles if any are configured
            if (guildData.autoRoles && guildData.autoRoles.length > 0) {
                try {
                    for (const roleId of guildData.autoRoles) {
                        const role = member.guild.roles.cache.get(roleId);
                        if (role) {
                            await member.roles.add(role);
                        }
                    }
                } catch (error) {
                    console.error(`Error assigning auto roles to ${member.user.tag}:`, error);
                }
            }
        } catch (error) {
            console.error(`Error handling new member ${member.user.tag}:`, error);
        }
    }
};
