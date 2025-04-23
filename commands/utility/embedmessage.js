const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { handleCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedmessage')
        .setDescription('Create and send a custom embed message')
        .addStringOption(option => 
            option.setName('title')
                .setDescription('Title of the embed')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('Description/content of the embed')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel to send the embed to')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('color')
                .setDescription('Color of the embed (hex code or basic color name)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('image_url')
                .setDescription('URL of an image to display in the embed')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('footer')
                .setDescription('Footer text for the embed')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    cooldown: true,
    
    async execute(interaction) {
        try {
            // Check cooldown
            const cooldownCheck = handleCooldown(interaction, 'embedmessage', interaction.client.cooldowns);
            if (cooldownCheck.onCooldown) {
                return interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: '⏳ Command on Cooldown',
                            description: `You need to wait ${cooldownCheck.timeLeft} before creating another embed message.`
                        })
                    ],
                    ephemeral: true
                });
            }
            
            // Get options
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || config.colors.primary;
            const imageUrl = interaction.options.getString('image_url');
            const footer = interaction.options.getString('footer');
            const channel = interaction.options.getChannel('channel');
            
            // Validate URL if provided
            if (imageUrl) {
                const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
                if (!urlRegex.test(imageUrl)) {
                    return interaction.reply({
                        embeds: [
                            errorEmbed({
                                title: 'Invalid Image URL',
                                description: 'The image URL you provided is invalid. Please provide a proper URL.'
                            })
                        ],
                        ephemeral: true
                    });
                }
            }
            
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
            
            // Create the embed
            const embed = createEmbed({
                title,
                description,
                color,
                image: imageUrl,
                footer: footer ? { text: footer } : null,
                timestamp: true
            });
            
            // Send the embed to the target channel
            await channel.send({
                embeds: [embed]
            });
            
            // Send confirmation to the user
            return interaction.reply({
                embeds: [
                    successEmbed({
                        title: '✅ Embed Message Sent',
                        description: `Successfully sent the embed message to ${channel}.\n\nTitle: "${title}"`
                    })
                ],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error in embedmessage command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to send the embed message.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
