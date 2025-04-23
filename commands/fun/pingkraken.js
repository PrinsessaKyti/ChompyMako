const { SlashCommandBuilder } = require('discord.js');
const { handleCooldown } = require('../../utils/cooldown');
const { addCurrency } = require('../../utils/database');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pingkraken')
        .setDescription('Summon the mighty Kraken for a dramatic reply'),
    
    cooldown: true,
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            // Dramatic delay (1-3 seconds)
            const delay = Math.floor(Math.random() * 2000) + 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Random kraken responses
            const responses = [
                {
                    text: "The mighty Kraken has been summoned from the depths!",
                    action: "The ocean churns violently as tentacles rise from below...",
                    result: "The Kraken seems pleased with your offering and grants you 50 shells!"
                },
                {
                    text: "You dare disturb the slumber of the ancient one?",
                    action: "Dark clouds form overhead as the water begins to bubble...",
                    result: "The Kraken appreciates your boldness and gifts you 50 shells!"
                },
                {
                    text: "From the inky blackness of the abyss, the Kraken responds to your call!",
                    action: "The water parts as massive tentacles breach the surface...",
                    result: "Impressed by your courage, the Kraken leaves behind 50 shells!"
                },
                {
                    text: "The Kraken stirs from its ancient slumber!",
                    action: "The sea begins to swirl in a massive whirlpool...",
                    result: "The Kraken returns to the deep, leaving you 50 shells richer!"
                },
                {
                    text: "With a mighty rumble, the ocean floor trembles!",
                    action: "Sailors clutch their vessels as a massive form moves beneath...",
                    result: "The Kraken grants you 50 shells for your tribute!"
                }
            ];
            
            // Select a random response
            const response = responses[Math.floor(Math.random() * responses.length)];
            
            // Add currency as a reward
            addCurrency(interaction.user.id, 'shells', 50);
            
            // Create embed
            const embed = createEmbed({
                title: `🦑 ${response.text}`,
                description: `*${response.action}*\n\n${response.result}`,
                color: config.colors.primary,
                thumbnail: interaction.user.displayAvatarURL(),
                timestamp: true
            });
            
            return interaction.editReply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in pingkraken command:', error);
            return interaction.editReply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'Something went wrong while summoning the Kraken. It must have returned to the deep.'
                    })
                ]
            });
        }
    }
};
