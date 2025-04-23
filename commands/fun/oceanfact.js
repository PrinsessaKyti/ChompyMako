const { SlashCommandBuilder } = require('discord.js');
const { oceanFactEmbed, errorEmbed } = require('../../utils/embeds');
const oceanFacts = require('../../data/oceanFacts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oceanfact')
        .setDescription('Get a random ocean fact or sea legend')
        .addBooleanOption(option => 
            option.setName('lore')
                .setDescription('Set to true for mythical sea legends, false for scientific facts')
                .setRequired(false)),
    
    cooldown: true,
    
    async execute(interaction) {
        try {
            // Get the lore option (if specified)
            const loreOption = interaction.options.getBoolean('lore');
            
            let eligibleFacts;
            
            // If lore type is specified, filter facts
            if (loreOption !== null) {
                eligibleFacts = oceanFacts.filter(fact => fact.isLore === loreOption);
            } else {
                eligibleFacts = oceanFacts;
            }
            
            // Select a random fact
            const selectedFact = eligibleFacts[Math.floor(Math.random() * eligibleFacts.length)];
            
            // Create and send the embed
            const embed = oceanFactEmbed(selectedFact);
            
            return interaction.reply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in oceanfact command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'Something went wrong while fetching an ocean fact. Please try again later.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
