const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { moderationEmbed, errorEmbed } = require('../../utils/embeds');
const { addModAction } = require('../../utils/database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        try {
            // Get options
            const targetUser = interaction.options.getUser('user');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const reason = interaction.options.getString('reason') || config.moderation.defaultReasons.kick;
            
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
            
            // Check if moderator can kick the target
            if (!canModerate(interaction.member, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Permission Denied',
                            description: "You don't have permission to kick this user. They may have a higher role than you, or you may not have kick permissions."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Check if bot can kick the target
            if (!botCanModerate(interaction.guild, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Bot Permission Denied',
                            description: "I don't have permission to kick this user. They may have a higher role than me."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Try to DM the user before kicking
            try {
                const dmEmbed = moderationEmbed({
                    title: `You've been kicked from ${interaction.guild.name}`,
                    description: `**Reason:** ${reason}`,
                    fields: [
                        {
                            name: 'Kicked By',
                            value: interaction.user.tag
                        }
                    ]
                });
                
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    // Continue even if DM fails
                    console.log(`Could not DM user ${targetUser.tag} about their kick`);
                });
            } catch (error) {
                console.error(`Error sending DM to ${targetUser.tag}:`, error);
            }
            
            // Perform the kick
            try {
                await targetMember.kick(`${interaction.user.tag}: ${reason}`);
                
                // Log the action to database
                addModAction(interaction.guild.id, {
                    type: 'kick',
                    targetId: targetUser.id,
                    moderatorId: interaction.user.id,
                    reason: reason
                });
                
                // Create and send the success embed
                const embed = moderationEmbed({
                    title: '🚢 User Kicked',
                    description: `${targetUser} has been sent overboard.`,
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
                
                return interaction.reply({
                    embeds: [embed]
                });
                
            } catch (error) {
                console.error('Error kicking user:', error);
                
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Kick Failed',
                            description: `I couldn't kick ${targetUser}. Please check my permissions and try again.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in kick command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to kick the user.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
