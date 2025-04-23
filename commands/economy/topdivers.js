const { SlashCommandBuilder } = require('discord.js');
const { getTopUsers } = require('../../utils/database');
const { leaderboardEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topdivers')
        .setDescription('View the server\'s leaderboard')
        .addStringOption(option => 
            option.setName('category')
                .setDescription('What to rank users by')
                .setRequired(true)
                .addChoices(
                    { name: 'XP & Levels', value: 'xp' },
                    { name: 'Shells', value: 'shells' },
                    { name: 'Pearls', value: 'pearls' },
                    { name: 'Creatures Caught', value: 'creatures' }
                )),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            // Get the category option
            const category = interaction.options.getString('category');
            
            // Get the top users for this category
            const topUsers = getTopUsers(interaction.guild.id, interaction.client, category, 10);
            
            // Add username info to each user from the Discord API
            for (const user of topUsers) {
                try {
                    const discordUser = await interaction.client.users.fetch(user.id);
                    user.username = discordUser.username;
                    user.avatarURL = discordUser.displayAvatarURL();
                } catch (error) {
                    console.error(`Error fetching user ${user.id}:`, error);
                    user.username = `Unknown User (${user.id})`;
                }
            }
            
            // Create and send the leaderboard embed
            const embed = leaderboardEmbed(topUsers, category, interaction.guild);
            
            return interaction.editReply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in topdivers command:', error);
            return interaction.editReply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'Something went wrong while generating the leaderboard. Please try again later.'
                    })
                ]
            });
        }
    }
};
