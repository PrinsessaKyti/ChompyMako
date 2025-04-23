const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleCooldown } = require('../../utils/cooldown');
const { addCurrency, getUser } = require('../../utils/database');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voyage')
        .setDescription('Embark on a sea adventure to discover treasures'),
    
    cooldown: true,
    
    async execute(interaction) {
        try {
            // Create the initial voyage embed
            const voyageEmbed = createEmbed({
                title: '⛵ Ocean Voyage',
                description: 'You prepare to set sail on a grand ocean adventure! The sea calls to you with promises of treasure and glory.',
                fields: [
                    {
                        name: 'Choose Your Destination',
                        value: '🏝️ **Tropical Island** - A paradise with moderate rewards and challenges\n' +
                               '🌋 **Volcanic Reef** - Dangerous waters with higher risk but better rewards\n' +
                               '🌊 **Deep Abyss** - The most perilous journey with the greatest potential treasures'
                    }
                ]
            });
            
            // Create buttons for destination choice
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('voyage|tropical')
                        .setLabel('Tropical Island')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏝️'),
                    new ButtonBuilder()
                        .setCustomId('voyage|volcanic')
                        .setLabel('Volcanic Reef')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🌋'),
                    new ButtonBuilder()
                        .setCustomId('voyage|abyss')
                        .setLabel('Deep Abyss')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🌊')
                );
            
            // Send the initial message with buttons
            const message = await interaction.reply({
                embeds: [voyageEmbed],
                components: [row],
                fetchReply: true
            });
            
            // Create a collector for the buttons
            const collector = message.createMessageComponentCollector({
                time: 60000 // 1 minute
            });
            
            // Handle button clicks
            collector.on('collect', async i => {
                // Verify the user is the same as the one who initiated the command
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: "This isn't your voyage! Start your own with `/voyage`",
                        ephemeral: true
                    });
                }
                
                // Get the destination from the button
                const [, destination] = i.customId.split('|');
                
                // Define adventure parameters based on destination
                let successChance, minReward, maxReward, storyLines;
                
                switch (destination) {
                    case 'tropical':
                        successChance = 0.8; // 80% success rate
                        minReward = 50;
                        maxReward = 150;
                        storyLines = {
                            start: "You set sail for the beautiful tropical islands on the horizon. The wind is favorable and the sea is calm.",
                            success: [
                                "You discover a hidden lagoon with a small treasure chest buried in the sand.",
                                "Native islanders welcome you and share some of their valuable pearls as a gift.",
                                "While exploring a coastal cave, you find forgotten pirate loot!"
                            ],
                            failure: [
                                "A sudden storm forces you to turn back before reaching the island.",
                                "Your ship gets caught in a coral reef, damaging your hull and forcing retreat.",
                                "Hostile wildlife drives you away from the island before you can find treasure."
                            ]
                        };
                        break;
                        
                    case 'volcanic':
                        successChance = 0.6; // 60% success rate
                        minReward = 100;
                        maxReward = 300;
                        storyLines = {
                            start: "You bravely sail toward the volcanic reef. Smoke rises from the distant active volcano, and the waters grow warmer.",
                            success: [
                                "You navigate through the treacherous volcanic vents and discover rare minerals worth a fortune!",
                                "In a cooling lava tube, you find crystalized gems that sparkle with extraordinary brilliance.",
                                "Diving near the volcano's base, you collect valuable obsidian and underwater diamonds."
                            ],
                            failure: [
                                "The volcano violently erupts, forcing a hasty retreat through ash-filled skies.",
                                "Scalding water vents suddenly burst nearby, damaging your ship and equipment.",
                                "Toxic gases from the underwater vents make exploration impossible, and you must turn back."
                            ]
                        };
                        break;
                        
                    case 'abyss':
                        successChance = 0.4; // 40% success rate
                        minReward = 200;
                        maxReward = 500;
                        storyLines = {
                            start: "You steel your nerves and chart a course for the legendary Deep Abyss. The water darkens as you sail into uncharted territory.",
                            success: [
                                "In the crushing depths, you find a cache of ancient treasure from a civilization lost to time!",
                                "A friendly leviathan guides you to a grotto filled with legendary ocean pearls.",
                                "You discover the wreckage of a mythical ship, its hold still filled with gold and jewels."
                            ],
                            failure: [
                                "The immense pressure damages your equipment, forcing an emergency ascent before reaching the treasure.",
                                "A territorial Kraken guards the depths, forcing you to flee for your life!",
                                "Disorienting currents in the abyss lead you astray, and you barely escape with your vessel intact."
                            ]
                        };
                        break;
                }
                
                // Disable the buttons
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        ButtonBuilder.from(row.components[0]).setDisabled(true),
                        ButtonBuilder.from(row.components[1]).setDisabled(true),
                        ButtonBuilder.from(row.components[2]).setDisabled(true)
                    );
                
                // Update the message with the adventure's start
                await i.update({
                    embeds: [
                        createEmbed({
                            title: '⛵ Ocean Voyage',
                            description: storyLines.start,
                            footer: { text: 'Your adventure is underway...' }
                        })
                    ],
                    components: [disabledRow]
                });
                
                // Create suspense with a delay (3-5 seconds)
                const delay = Math.floor(Math.random() * 2000) + 3000;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Determine success or failure
                const success = Math.random() < successChance;
                
                // Get appropriate story line
                const stories = success ? storyLines.success : storyLines.failure;
                const story = stories[Math.floor(Math.random() * stories.length)];
                
                // Calculate reward if successful
                let reward = 0;
                if (success) {
                    reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
                    addCurrency(interaction.user.id, 'shells', reward);
                }
                
                // Create result embed
                const resultEmbed = success
                    ? successEmbed({
                        title: '🎉 Voyage Successful!',
                        description: `${story}\n\n**Reward:** ${config.currency.symbol} ${reward} ${config.currency.name}`,
                        footer: { text: 'You return triumphantly from your adventure!' },
                        timestamp: true
                    })
                    : errorEmbed({
                        title: '❌ Voyage Failed',
                        description: story,
                        footer: { text: 'Better luck on your next adventure...' },
                        timestamp: true
                    });
                
                // Send the result
                await interaction.followUp({
                    embeds: [resultEmbed]
                });
                
            });
            
            // When the collector ends (timeout), disable all buttons
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    try {
                        const disabledRow = new ActionRowBuilder()
                            .addComponents(
                                ButtonBuilder.from(row.components[0]).setDisabled(true),
                                ButtonBuilder.from(row.components[1]).setDisabled(true),
                                ButtonBuilder.from(row.components[2]).setDisabled(true)
                            );
                            
                        await message.edit({
                            components: [disabledRow],
                            embeds: [
                                createEmbed({
                                    title: '⏱️ Voyage Cancelled',
                                    description: 'You took too long to decide, and the favorable winds have passed.',
                                    color: config.colors.warning
                                })
                            ]
                        });
                    } catch (error) {
                        console.error('Error updating timed-out voyage message:', error);
                    }
                }
            });
            
        } catch (error) {
            console.error('Error in voyage command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'Something went wrong while preparing your voyage. The ship isn\'t seaworthy at the moment.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};
