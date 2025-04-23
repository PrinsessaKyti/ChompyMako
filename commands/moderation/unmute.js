const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { moderationEmbed, errorEmbed } = require('../../utils/embeds');
const { addModAction } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove a timeout from a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to remove timeout from')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for removing the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            // Get options
            const targetUser = interaction.options.getUser('user');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const reason = interaction.options.getString('reason') || 'Timeout removed by moderator';
            
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
            
            // Check if the user is actually timed out
            if (!targetMember.communicationDisabledUntil) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Not Timed Out',
                            description: `${targetUser} is not currently timed out.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Check if moderator can manage the target
            if (!canModerate(interaction.member, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Permission Denied',
                            description: "You don't have permission to remove timeouts from this user. They may have a higher role than you, or you may not have moderation permissions."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Check if bot can manage the target
            if (!botCanModerate(interaction.guild, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Bot Permission Denied',
                            description: "I don't have permission to manage this user. They may have a higher role than me."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Perform the unmute (remove timeout)
            try {
                await targetMember.timeout(null, `${interaction.user.tag}: ${reason}`);
                
                // Log the action to database
                addModAction(interaction.guild.id, {
                    type: 'untimeout',
                    targetId: targetUser.id,
                    moderatorId: interaction.user.id,
                    reason: reason
                });
                
                // Create and send the success embed
                const embed = moderationEmbed({
                    title: '🔊 User Timeout Removed',
                    description: `${targetUser} can speak once more.`,
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
                            name: 'Reason',
                            value: reason
                        }
                    ]
                });
                
                // Try to DM the user to let them know their timeout was removed
                try {
                    const dmEmbed = moderationEmbed({
                        title: `Your timeout has been removed in ${interaction.guild.name}`,
                        description: `**Reason:** ${reason}`,
                        fields: [
                            {
                                name: 'Removed By',
                                value: interaction.user.tag
                            }
                        ]
                    });
                    
                    await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                        // Continue even if DM fails
                        console.log(`Could not DM user ${targetUser.tag} about their timeout removal`);
                    });
                } catch (error) {
                    console.error(`Error sending DM to ${targetUser.tag}:`, error);
                }
                
                return interaction.reply({
                    embeds: [embed]
                });
                
            } catch (error) {
                console.error('Error removing timeout from user:', error);
                
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Timeout Removal Failed',
                            description: `I couldn't remove the timeout from ${targetUser}. Please check my permissions and try again.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in unmute command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to remove the timeout.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
