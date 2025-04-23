const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../utils/database');
const { balanceEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pearlbalance')
        .setDescription('Check your currency balance')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('View another user\'s balance')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            // Get target user (either mentioned or self)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            
            // Get user data
            const userData = getUser(targetUser.id);
            
            // Create and send the balance embed
            const embed = balanceEmbed(targetUser, userData);
            
            return interaction.reply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in pearlbalance command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'Something went wrong while checking the balance. Please try again later.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
