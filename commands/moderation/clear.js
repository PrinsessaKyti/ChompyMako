const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear a number of messages from the channel')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Number of messages to clear (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Only clear messages from this user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            // Defer the reply to give time for message deletion
            await interaction.deferReply({ ephemeral: true });
            
            // Get options
            const amount = interaction.options.getInteger('amount');
            const targetUser = interaction.options.getUser('user');
            
            // Fetch messages from the channel
            const messages = await interaction.channel.messages.fetch({ limit: amount + 1 }); // +1 to account for command message in non-ephemeral case
            
            // Filter messages if user option is provided
            let messagesToDelete;
            if (targetUser) {
                messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id);
            } else {
                messagesToDelete = messages;
            }
            
            // Discord only allows bulk deletion of messages that are less than 14 days old
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            
            // Split messages by age for different deletion methods
            const oldMessages = messagesToDelete.filter(msg => msg.createdTimestamp <= twoWeeksAgo);
            
            // Delete messages
            let deletedCount = 0;
            
            // Bulk delete recent messages if there are any
            if (recentMessages.size > 0) {
                try {
                    const deleted = await interaction.channel.bulkDelete(recentMessages);
                    deletedCount += deleted.size;
                } catch (error) {
                    console.error('Error bulk deleting messages:', error);
                    
                    // If bulk delete fails for any reason, try deleting messages one by one
                    for (const [, message] of recentMessages) {
                        try {
                            await message.delete();
                            deletedCount++;
                        } catch (err) {
                            console.error(`Error deleting message ${message.id}:`, err);
                        }
                    }
                }
            }
            
            // Delete old messages one by one (cannot use bulkDelete)
            for (const [, message] of oldMessages) {
                try {
                    await message.delete();
                    deletedCount++;
                } catch (error) {
                    console.error(`Error deleting old message ${message.id}:`, error);
                }
            }
            
            // Create the success message
            let description;
            if (targetUser) {
                description = `Successfully cleared ${deletedCount} message(s) from ${targetUser.tag}.`;
            } else {
                description = `Successfully cleared ${deletedCount} message(s) from this channel.`;
            }
            
            // Reply with the result
            return interaction.editReply({
                embeds: [
                    successEmbed({
                        title: '🧹 Messages Cleared',
                        description
                    })
                ],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error in clear command:', error);
            return interaction.editReply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'An unexpected error occurred while trying to clear messages.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
