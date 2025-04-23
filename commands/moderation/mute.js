const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { moderationEmbed, errorEmbed } = require('../../utils/embeds');
const { addModAction } = require('../../utils/database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a user (prevent them from sending messages)')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Duration of the timeout (e.g. 1h, 30m, 1d)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            // Get options
            const targetUser = interaction.options.getUser('user');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const durationString = interaction.options.getString('duration') || '1h';
            const reason = interaction.options.getString('reason') || config.moderation.defaultReasons.mute;
            
            // Parse duration string (e.g., 1h, 30m, 1d)
            let durationMs = config.moderation.muteDuration; // Default from config
            
            if (durationString) {
                const durationRegex = /^(\d+)([mhd])$/;
                const match = durationString.match(durationRegex);
                
                if (match) {
                    const amount = parseInt(match[1]);
                    const unit = match[2];
                    
                    switch(unit) {
                        case 'm': // minutes
                            durationMs = amount * 60 * 1000;
                            break;
                        case 'h': // hours
                            durationMs = amount * 60 * 60 * 1000;
                            break;
                        case 'd': // days
                            durationMs = amount * 24 * 60 * 60 * 1000;
                            break;
                    }
                }
            }
            
            // Discord API has a maximum timeout duration of 28 days
            const maxTimeoutDuration = 28 * 24 * 60 * 60 * 1000;
            if (durationMs > maxTimeoutDuration) {
                durationMs = maxTimeoutDuration;
            }
            
            // Check if target is valid
            if (!targetMember) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Error',
                            description: 'That user is not a member of this server.'
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Check if moderator can timeout the target
            if (!canModerate(interaction.member, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Permission Denied',
                            description: "You don't have permission to timeout this user. They may have a higher role than you, or you may not have moderation permissions."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Check if bot can timeout the target
            if (!botCanModerate(interaction.guild, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Bot Permission Denied',
                            description: "I don't have permission to timeout this user. They may have a higher role than me."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Try to DM the user before timing them out
            try {
                // Format duration for display
                let readableDuration;
                if (durationMs < 60 * 1000) {
                    readableDuration = `${Math.ceil(durationMs / 1000)} seconds`;
                } else if (durationMs < 60 * 60 * 1000) {
                    readableDuration = `${Math.ceil(durationMs / (60 * 1000))} minutes`;
                } else if (durationMs < 24 * 60 * 60 * 1000) {
                    readableDuration = `${Math.ceil(durationMs / (60 * 60 * 1000))} hours`;
                } else {
                    readableDuration = `${Math.ceil(durationMs / (24 * 60 * 60 * 1000))} days`;
                }
                
                const dmEmbed = moderationEmbed({
                    title: `You've been timed out in ${interaction.guild.name}`,
                    description: `**Reason:** ${reason}\n**Duration:** ${readableDuration}`,
                    fields: [
                        {
                            name: 'Timed Out By',
                            value: interaction.user.tag
                        }
                    ]
                });
                
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    // Continue even if DM fails
                    console.log(`Could not DM user ${targetUser.tag} about their timeout`);
                });
            } catch (error) {
                console.error(`Error sending DM to ${targetUser.tag}:`, error);
            }
            
            // Perform the timeout
            try {
                await targetMember.timeout(durationMs, `${interaction.user.tag}: ${reason}`);
                
                // Log the action to database
                addModAction(interaction.guild.id, {
                    type: 'timeout',
                    targetId: targetUser.id,
                    moderatorId: interaction.user.id,
                    reason: reason,
                    duration: durationMs
                });
                
                // Format duration for display
                let readableDuration;
                if (durationMs < 60 * 1000) {
                    readableDuration = `${Math.ceil(durationMs / 1000)} seconds`;
                } else if (durationMs < 60 * 60 * 1000) {
                    readableDuration = `${Math.ceil(durationMs / (60 * 1000))} minutes`;
                } else if (durationMs < 24 * 60 * 60 * 1000) {
                    readableDuration = `${Math.ceil(durationMs / (60 * 60 * 1000))} hours`;
                } else {
                    readableDuration = `${Math.ceil(durationMs / (24 * 60 * 60 * 1000))} days`;
                }
                
                // Create and send the success embed
                const embed = moderationEmbed({
                    title: '🔇 User Timed Out',
                    description: `${targetUser} has been gagged for ${readableDuration}.`,
                    fields: [
                        {
                            name: 'User',
                            value: `${targetUser.tag} (${targetUser.id})`,
                            inline: true
                        },
                        {
                            name: 'Moderator',
                            value: interaction.user.tag,
                            inline: true
                        },
                        {
                            name: 'Duration',
                            value: readableDuration,
                            inline: true
                        },
                        {
                            name: 'Reason',
                            value: reason
                        }
                    ]
                });
                
                return interaction.reply({
                    embeds: [embed]
                });
                
            } catch (error) {
                console.error('Error timing out user:', error);
                
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Timeout Failed',
                            description: `I couldn't timeout ${targetUser}. Please check my permissions and try again.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in mute command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to timeout the user.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
