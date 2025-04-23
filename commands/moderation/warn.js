const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { moderationEmbed, errorEmbed } = require('../../utils/embeds');
const { addWarning, getWarnings } = require('../../utils/database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning to a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the warning')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            // Get options
            const targetUser = interaction.options.getUser('user');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const reason = interaction.options.getString('reason') || config.moderation.defaultReasons.warn;
            
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
            
            // Check if moderator can warn the target
            if (!canModerate(interaction.member, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Permission Denied',
                            description: "You don't have permission to warn this user. They may have a higher role than you, or you may not have moderation permissions."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Add warning
            const warnings = addWarning(targetUser.id, interaction.guild.id, reason, interaction.user.id);
            
            // Check if user has reached the warning threshold
            if (warnings.length >= config.moderation.maxWarnings) {
                // Perform the configured auto-action
                try {
                    const autoActionMsg = `Automatically ${config.moderation.autoAction}d after receiving ${warnings.length} warnings`;
                    
                    switch (config.moderation.autoAction) {
                        case 'mute':
                            if (botCanModerate(interaction.guild, targetMember)) {
                                await targetMember.timeout(
                                    config.moderation.muteDuration,
                                    `Auto-action by ${interaction.client.user.tag}: ${autoActionMsg}`
                                );
                            }
                            break;
                        case 'kick':
                            if (botCanModerate(interaction.guild, targetMember)) {
                                await targetMember.kick(`Auto-action by ${interaction.client.user.tag}: ${autoActionMsg}`);
                            }
                            break;
                        case 'ban':
                            if (botCanModerate(interaction.guild, targetMember)) {
                                await interaction.guild.members.ban(targetUser.id, {
                                    reason: `Auto-action by ${interaction.client.user.tag}: ${autoActionMsg}`
                                });
                            }
                            break;
                    }
                } catch (error) {
                    console.error(`Error performing auto-action against ${targetUser.tag}:`, error);
                }
            }
            
            // Try to DM the user about the warning
            try {
                const dmEmbed = moderationEmbed({
                    title: `You've been warned in ${interaction.guild.name}`,
                    description: `**Reason:** ${reason}\n\nThis is warning #${warnings.length}. ${config.moderation.maxWarnings - warnings.length} warnings remain before automatic action is taken.`,
                    fields: [
                        {
                            name: 'Warned By',
                            value: interaction.user.tag
                        }
                    ]
                });
                
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    // Continue even if DM fails
                    console.log(`Could not DM user ${targetUser.tag} about their warning`);
                });
            } catch (error) {
                console.error(`Error sending DM to ${targetUser.tag}:`, error);
            }
            
            // Create and send the success embed
            const embed = moderationEmbed({
                title: '⚠️ User Warned',
                description: `${targetUser} has been issued a warning.`,
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
                        name: 'Warning Count',
                        value: `${warnings.length}/${config.moderation.maxWarnings}`,
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason
                    },
                    {
                        name: 'Auto-action',
                        value: warnings.length >= config.moderation.maxWarnings 
                            ? `User has reached the warning threshold. Auto ${config.moderation.autoAction} has been applied.`
                            : `${config.moderation.maxWarnings - warnings.length} warnings remain before automatic ${config.moderation.autoAction}.`
                    }
                ]
            });
            
            return interaction.reply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in warn command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to warn the user.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
