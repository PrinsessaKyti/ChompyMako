const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { checkBotPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel (allow everyone to send messages again)')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to unlock (defaults to current channel)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
                .setRequired(false))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for unlocking the channel')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        try {
            // Get options
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const reason = interaction.options.getString('reason') || 'Channel unlocked by moderator';
            
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
                            description: `I don't have the required permissions to unlock this channel.\nMissing: ${permissionCheck.missing.join(', ')}`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Get current permissions for the @everyone role
            const everyoneRole = interaction.guild.roles.everyone;
            const currentPermissions = channel.permissionOverwrites.resolve(everyoneRole.id);
            
            // Check if the channel is actually locked
            if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: 'Channel Not Locked',
                            description: `${channel} is not currently locked.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Update channel permissions to allow SendMessages for @everyone
            // We'll use null to reset to default permissions rather than explicitly setting to true
            const existingOverwrites = channel.permissionOverwrites.resolve(everyoneRole.id);
            const newOverwrites = {};
            
            // Copy existing permission overwrites, excluding SendMessages
            if (existingOverwrites) {
                for (const [key, value] of Object.entries(existingOverwrites.allow.serialize())) {
                    if (value && key !== 'SendMessages') {
                        newOverwrites[key] = true;
                    }
                }
                
                for (const [key, value] of Object.entries(existingOverwrites.deny.serialize())) {
                    if (value && key !== 'SendMessages') {
                        newOverwrites[key] = false;
                    }
                }
            }
            
            await channel.permissionOverwrites.edit(everyoneRole, {
                ...newOverwrites,
                SendMessages: null // Reset to default
            }, { reason: `${interaction.user.tag}: ${reason}` });
            
            // Send success message
            return interaction.reply({
                embeds: [
                    successEmbed({
                        title: '🔓 Channel Unlocked',
                        description: `${channel} has been unlocked. Users can now send messages again.`,
                        fields: [
                            {
                                name: 'Reason',
                                value: reason
                            },
                            {
                                name: 'Unlocked By',
                                value: interaction.user.tag
                            }
                        ]
                    })
                ]
            });
            
        } catch (error) {
            console.error('Error in unlock command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to unlock the channel.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
