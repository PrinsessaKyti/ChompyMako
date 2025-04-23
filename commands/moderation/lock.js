const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { checkBotPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel (prevent everyone from sending messages)')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to lock (defaults to current channel)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
                .setRequired(false))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for locking the channel')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        try {
            // Get options
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const reason = interaction.options.getString('reason') || 'Channel locked by moderator';
            
            // Check if the bot has permissions to manage the channel
            const permissionCheck = checkBotPermissions(
                interaction.guild,
                channel,
                ['ManageChannels', 'ManageRoles']
            );
            
            if (!permissionCheck.hasPermission) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Missing Permissions',
                            description: `I don't have the required permissions to lock this channel.\nMissing: ${permissionCheck.missing.join(', ')}`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Get current permissions for the @everyone role
            const everyoneRole = interaction.guild.roles.everyone;
            const currentPermissions = channel.permissionOverwrites.resolve(everyoneRole.id);
            
            // Check if the channel is already locked
            if (currentPermissions && currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Channel Already Locked',
                            description: `${channel} is already locked.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Update channel permissions to deny SendMessages for @everyone
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            }, { reason: `${interaction.user.tag}: ${reason}` });
            
            // Send success message
            return interaction.reply({
                embeds: [
                    successEmbed({
                        title: '🔒 Channel Locked',
                        description: `${channel} has been locked. Users cannot send messages until the channel is unlocked.`,
                        fields: [
                            {
                                name: 'Reason',
                                value: reason
                            },
                            {
                                name: 'Locked By',
                                value: interaction.user.tag
                            }
                        ]
                    })
                ]
            });
            
        } catch (error) {
            console.error('Error in lock command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to lock the channel.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
