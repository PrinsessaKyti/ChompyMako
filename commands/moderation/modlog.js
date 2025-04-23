const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getModActions } = require('../../utils/database');
const { moderationEmbed, errorEmbed } = require('../../utils/embeds');
const { isModerator } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('View moderation actions for a user or in the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to view mod actions for (leave empty for all actions)')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('limit')
                .setDescription('Number of actions to display (default 10)')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            // Check if user is a moderator (belt-and-suspenders check in addition to permissions)
            if (!isModerator(interaction.member)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Permission Denied',
                            description: 'You must be a moderator to use this command.'
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Defer reply since fetching user data might take time
            await interaction.deferReply();
            
            // Get options
            const targetUser = interaction.options.getUser('user');
            const limit = interaction.options.getInteger('limit') || 10;
            
            // Get mod actions for the server, filtered by user if provided
            const actions = getModActions(interaction.guild.id, targetUser ? targetUser.id : null);
            
            // If no actions, return a simple message
            if (!actions || actions.length === 0) {
                return interaction.editReply({
                    embeds: [
                        moderationEmbed({
                            title: '📋 Moderation Log',
                            description: targetUser 
                                ? `No moderation actions found for ${targetUser}.`
                                : 'No moderation actions found in this server.'
                        })
                    ]
                });
            }
            
            // Sort actions by timestamp (newest first)
            const sortedActions = [...actions].sort((a, b) => b.timestamp - a.timestamp);
            
            // Limit to the requested number
            const limitedActions = sortedActions.slice(0, limit);
            
            // Format actions for display
            let actionsList = '';
            
            for (let i = 0; i < limitedActions.length; i++) {
                const action = limitedActions[i];
                const timestamp = new Date(action.timestamp).toLocaleString();
                
                // Get user information
                let targetInfo = 'Unknown User';
                let moderatorInfo = 'Unknown Moderator';
                
                try {
                    const targetUser = await interaction.client.users.fetch(action.targetId);
                    targetInfo = `${targetUser.tag} (${targetUser.id})`;
                } catch (error) {
                    targetInfo = `Unknown User (${action.targetId})`;
                }
                
                try {
                    if (action.moderatorId) {
                        const moderatorUser = await interaction.client.users.fetch(action.moderatorId);
                        moderatorInfo = `${moderatorUser.tag}`;
                    }
                } catch (error) {
                    moderatorInfo = `Unknown Moderator (${action.moderatorId})`;
                }
                
                // Format action type
                let actionType;
                switch(action.type) {
                    case 'ban': actionType = '🔨 Ban'; break;
                    case 'kick': actionType = '👢 Kick'; break;
                    case 'timeout': actionType = '🔇 Timeout'; break;
                    case 'untimeout': actionType = '🔊 Timeout Removed'; break;
                    case 'warning': actionType = '⚠️ Warning'; break;
                    default: actionType = action.type;
                }
                
                // Format duration if applicable
                let durationText = '';
                if (action.duration) {
                    const durationMs = action.duration;
                    if (durationMs < 60 * 1000) {
                        durationText = `${Math.round(durationMs / 1000)} seconds`;
                    } else if (durationMs < 60 * 60 * 1000) {
                        durationText = `${Math.round(durationMs / (60 * 1000))} minutes`;
                    } else if (durationMs < 24 * 60 * 60 * 1000) {
                        durationText = `${Math.round(durationMs / (60 * 60 * 1000))} hours`;
                    } else {
                        durationText = `${Math.round(durationMs / (24 * 60 * 60 * 1000))} days`;
                    }
                }
                
                actionsList += `**${i + 1}. ${actionType}** - ${timestamp}\n`;
                actionsList += `**User:** ${targetInfo}\n`;
                actionsList += `**Moderator:** ${moderatorInfo}\n`;
                if (durationText) {
                    actionsList += `**Duration:** ${durationText}\n`;
                }
                actionsList += `**Reason:** ${action.reason || 'No reason provided'}\n\n`;
            }
            
            // Create and send the modlog embed
            const embed = moderationEmbed({
                title: targetUser 
                    ? `📋 Moderation Log for ${targetUser.tag}`
                    : '📋 Server Moderation Log',
                description: `Showing ${limitedActions.length} of ${actions.length} total actions:\n\n${actionsList}`,
                footer: {
                    text: `Server: ${interaction.guild.name}`
                },
                timestamp: true
            });
            
            return interaction.editReply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in modlog command:', error);
            return interaction.editReply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to retrieve moderation logs.'
                    })
                ]
            });
        }
    }
};
