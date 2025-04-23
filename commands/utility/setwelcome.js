const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateGuild, getGuild } = require('../../utils/database');
const { successEmbed, errorEmbed, welcomeEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Set up welcome messages for new members')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel to send welcome messages in')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The welcome message (Use {user}, {username}, {server}, {membercount} as placeholders)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Get options
            const channel = interaction.options.getChannel('channel');
            const welcomeMessage = interaction.options.getString('message');
            
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
            
            // Get current guild settings
            const guildData = getGuild(interaction.guild.id);
            
            // Update settings
            const updateData = {
                welcomeChannel: channel.id
            };
            
            // Update welcome message if provided
            if (welcomeMessage) {
                updateData.welcomeMessage = welcomeMessage;
            }
            
            // Update guild settings
            updateGuild(interaction.guild.id, updateData);
            
            // Show example welcome message
            const exampleUser = interaction.member;
            const exampleEmbed = welcomeEmbed(exampleUser, interaction.guild);
            
            // Create the success message
            const successMessage = successEmbed({
                title: '✅ Welcome Channel Set',
                description: `Welcome messages will now be sent to ${channel}.\n\n${welcomeMessage ? 'Custom welcome message set.' : 'Using default welcome message.'}`,
                fields: [
                    {
                        name: 'Preview',
                        value: 'Below is how welcome messages will appear:'
                    }
                ]
            });
            
            // Send success message with example
            return interaction.reply({
                embeds: [successMessage, exampleEmbed]
            });
            
        } catch (error) {
            console.error('Error in setwelcome command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to set up welcome messages.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
