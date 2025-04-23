const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { moderationEmbed, errorEmbed } = require('../../utils/embeds');
const { addModAction } = require('../../utils/database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the ban')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        try {
            // Get options
            const targetUser = interaction.options.getUser('user');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const reason = interaction.options.getString('reason') || config.moderation.defaultReasons.ban;
            const days = interaction.options.getInteger('days') || 0;
            
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
            
            // Check if moderator can ban the target
            if (!canModerate(interaction.member, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Permission Denied',
                            description: "You don't have permission to ban this user. They may have a higher role than you, or you may not have ban permissions."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Check if bot can ban the target
            if (!botCanModerate(interaction.guild, targetMember)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Bot Permission Denied',
                            description: "I don't have permission to ban this user. They may have a higher role than me."
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Try to DM the user before banning
            try {
                const dmEmbed = moderationEmbed({
                    title: `You've been banned from ${interaction.guild.name}`,
                    description: `**Reason:** ${reason}`,
                    fields: [
                        {
                            name: 'Banned By',
                            value: interaction.user.tag
                        }
                    ]
                });
                
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    // Continue even if DM fails
                    console.log(`Could not DM user ${targetUser.tag} about their ban`);
                });
            } catch (error) {
                console.error(`Error sending DM to ${targetUser.tag}:`, error);
            }
            
            // Perform the ban
            try {
                await interaction.guild.members.ban(targetUser.id, { 
                    reason: `${interaction.user.tag}: ${reason}`,
                    deleteMessageDays: days
                });
                
                // Log the action to database
                addModAction(interaction.guild.id, {
                    type: 'ban',
                    targetId: targetUser.id,
                    moderatorId: interaction.user.id,
                    reason: reason
                });
                
                // Create and send the success embed
                const embed = moderationEmbed({
                    title: '⚓ User Banned',
                    description: `${targetUser} has been banished from the seas.`,
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
                console.error('Error banning user:', error);
                
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Ban Failed',
                            description: `I couldn't ban ${targetUser}. Please check my permissions and try again.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in ban command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to ban the user.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
