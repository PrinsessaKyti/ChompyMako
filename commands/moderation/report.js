const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getGuild } = require('../../utils/database');
const { errorEmbed, successEmbed, moderationEmbed } = require('../../utils/embeds');
const { handleCooldown } = require('../../utils/cooldown');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report a user for breaking the rules')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to report')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the report')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('evidence')
                .setDescription('Any evidence for the report (e.g., message links, screenshots)')
                .setRequired(false)),
    
    cooldown: true,
    
    async execute(interaction) {
        try {
            // Check cooldown
            const cooldownCheck = handleCooldown(interaction, 'report', interaction.client.cooldowns);
            if (cooldownCheck.onCooldown) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: '⏳ Command on Cooldown',
                            description: `You need to wait ${cooldownCheck.timeLeft} before reporting another user.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Get options
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const evidence = interaction.options.getString('evidence') || 'No evidence provided';
            
            // Get guild settings
            const guildData = getGuild(interaction.guild.id);
            
            // Find the mod logs channel
            let logsChannel;
            if (guildData.logsChannel) {
                logsChannel = interaction.guild.channels.cache.get(guildData.logsChannel);
            }
            
            // If no logs channel set, try to find one with a relevant name
            if (!logsChannel) {
                logsChannel = interaction.guild.channels.cache.find(channel => 
                    (channel.name.toLowerCase().includes('mod-log') ||
                     channel.name.toLowerCase().includes('reports') ||
                     channel.name.toLowerCase().includes('logs')) && 
                    channel.isTextBased()
                );
            }
            
            // If still no logs channel, return an error
            if (!logsChannel) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'No Reports Channel',
                            description: 'This server does not have a channel set up for reports. Please contact a moderator directly.'
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Create report embed
            const reportEmbed = moderationEmbed({
                title: '🚨 User Report',
                description: `A user has been reported to the moderation team.`,
                fields: [
                    {
                        name: 'Reported User',
                        value: `${targetUser} (${targetUser.tag}, ${targetUser.id})`,
                        inline: false
                    },
                    {
                        name: 'Reported By',
                        value: `${interaction.user} (${interaction.user.tag}, ${interaction.user.id})`,
                        inline: false
                    },
                    {
                        name: 'Channel',
                        value: `${interaction.channel} (${interaction.channel.id})`,
                        inline: false
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: false
                    },
                    {
                        name: 'Evidence',
                        value: evidence,
                        inline: false
                    }
                ],
                timestamp: true
            });
            
            // Send the report to the logs channel
            await logsChannel.send({
                embeds: [reportEmbed]
            });
            
            // Send confirmation to the user
            return interaction.reply({
                embeds: [
                    successEmbed({
                        title: '✅ Report Submitted',
                        description: `Your report against ${targetUser} has been submitted to the moderation team. Thank you for helping keep the server safe!`,
                        footer: {
                            text: 'The moderation team will review your report as soon as possible.'
                        }
                    })
                ],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error in report command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to submit your report. Please try again later or contact a moderator directly.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
