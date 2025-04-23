const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateGuild, getGuild } = require('../../utils/database');
const { successEmbed, errorEmbed, moderationEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('Set the channel for moderation logs and reports')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel to send mod logs and reports in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Get options
            const channel = interaction.options.getChannel('channel');
            
            // Check if the bot has permission to send messages in the target channel
            const permissions = channel.permissionsFor(interaction.client.user);
            if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Missing Permissions',
                            description: `I don't have permission to send messages in ${channel}.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Update guild settings
            updateGuild(interaction.guild.id, {
                logsChannel: channel.id
            });
            
            // Create an example log message
            const exampleLogEmbed = moderationEmbed({
                title: '🔍 Example Log Entry',
                description: 'This is an example of a moderation log entry.',
                fields: [
                    {
                        name: 'User',
                        value: 'ExampleUser#0000',
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: 'Action',
                        value: 'Example Action',
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: 'This is an example of what mod log entries will look like.'
                    }
                ],
                timestamp: true
            });
            
            // Create the success message
            const successMessage = successEmbed({
                title: '✅ Logs Channel Set',
                description: `Moderation logs and reports will now be sent to ${channel}.`,
                fields: [
                    {
                        name: 'Preview',
                        value: 'Below is how log entries will appear:'
                    }
                ]
            });
            
            // Send a test message to the logs channel to verify permissions
            await channel.send({
                embeds: [
                    moderationEmbed({
                        title: '✅ Logs Channel Configured',
                        description: `This channel has been set as the moderation logs channel by ${interaction.user}.`,
                        timestamp: true
                    })
                ]
            });
            
            // Send success message with example
            return interaction.reply({
                embeds: [successMessage, exampleLogEmbed]
            });
            
        } catch (error) {
            console.error('Error in setlogs command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to set up the logs channel.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
