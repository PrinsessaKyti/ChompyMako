const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { checkBotPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set the slowmode (rate limit) for a channel')
        .addIntegerOption(option => 
            option.setName('seconds')
                .setDescription('The number of seconds for slowmode (0 to disable)')
                .setMinValue(0)
                .setMaxValue(21600) // Discord's max is 6 hours (21600 seconds)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for setting slowmode')
                .setRequired(false))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to set slowmode for (defaults to current channel)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        try {
            // Get options
            const seconds = interaction.options.getInteger('seconds');
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const reason = interaction.options.getString('reason') || 'Slowmode adjusted by moderator';
            
            // Check if the bot has permissions to manage the channel
            const permissionCheck = checkBotPermissions(
                interaction.guild,
                channel,
                ['ManageChannels']
            );
            
            if (!permissionCheck.hasPermission) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Missing Permissions',
                            description: `I don't have the required permissions to set slowmode for this channel.\nMissing: ${permissionCheck.missing.join(', ')}`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Set the slowmode
            await channel.setRateLimitPerUser(seconds, `${interaction.user.tag}: ${reason}`);
            
            // Format duration for better readability
            let durationText;
            if (seconds === 0) {
                durationText = 'disabled';
            } else if (seconds === 1) {
                durationText = '1 second';
            } else if (seconds < 60) {
                durationText = `${seconds} seconds`;
            } else if (seconds === 60) {
                durationText = '1 minute';
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                durationText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                
                const remainingSeconds = seconds % 60;
                if (remainingSeconds > 0) {
                    durationText += ` and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
                }
            } else if (seconds === 3600) {
                durationText = '1 hour';
            } else {
                const hours = Math.floor(seconds / 3600);
                durationText = `${hours} hour${hours !== 1 ? 's' : ''}`;
                
                const remainingMinutes = Math.floor((seconds % 3600) / 60);
                if (remainingMinutes > 0) {
                    durationText += ` and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
                }
            }
            
            // Send success message
            return interaction.reply({
                embeds: [
                    successEmbed({
                        title: '⏱️ Slowmode Set',
                        description: `Slowmode in ${channel} has been ${seconds === 0 ? 'disabled' : 'set to ' + durationText}.`,
                        fields: [
                            {
                                name: 'Reason',
                                value: reason
                            },
                            {
                                name: 'Set By',
                                value: interaction.user.tag
                            }
                        ]
                    })
                ]
            });
            
        } catch (error) {
            console.error('Error in slowmode command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to set slowmode.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
