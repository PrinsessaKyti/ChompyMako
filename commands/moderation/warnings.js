const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getWarnings } = require('../../utils/database');
const { moderationEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check warnings for')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            // Get target user
            const targetUser = interaction.options.getUser('user');
            
            // Get the user's warnings
            const warnings = getWarnings(targetUser.id);
            
            // If no warnings, return a simple message
            if (!warnings || warnings.length === 0) {
                return interaction.reply({
                    embeds: [
                        moderationEmbed({
                            title: '📋 Warnings',
                            description: `${targetUser} has no warnings.`
                        })
                    ]
                });
            }
            
            // Sort warnings by timestamp (newest first)
            const sortedWarnings = [...warnings].sort((a, b) => b.timestamp - a.timestamp);
            
            // Format warnings for display
            let warningList = '';
            
            for (let i = 0; i < sortedWarnings.length; i++) {
                const warning = sortedWarnings[i];
                const timestamp = new Date(warning.timestamp).toLocaleString();
                const moderator = warning.moderatorId 
                    ? `<@${warning.moderatorId}>`
                    : 'Unknown Moderator';
                
                warningList += `**Warning ${i + 1}** - ${timestamp}\n`;
                warningList += `**Reason:** ${warning.reason}\n`;
                warningList += `**Moderator:** ${moderator}\n\n`;
            }
            
            // Create and send the warnings embed
            const embed = moderationEmbed({
                title: `📋 Warnings for ${targetUser.tag}`,
                description: `${targetUser} has ${warnings.length} warning(s):\n\n${warningList}`,
                thumbnail: targetUser.displayAvatarURL()
            });
            
            return interaction.reply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in warnings command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to retrieve warnings.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
