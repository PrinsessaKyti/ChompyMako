const { SlashCommandBuilder } = require('discord.js');
const { handleCooldown } = require('../../utils/cooldown');
const { addCurrency, addInventoryItem, getUser } = require('../../utils/database');
const { creatureCaughtEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');
const seaCreatures = require('../../data/seaCreatures');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('castnet')
        .setDescription('Cast a net and try to catch a sea creature'),
    
    cooldown: true,
    
    async execute(interaction) {
        try {
            // Defer reply since catching might take a moment
            await interaction.deferReply();
            
            // Check user's inventory space
            const user = getUser(interaction.user.id);
            const inventoryLimit = config.catchGame.inventoryLimit;
            
            if (user.inventory && user.inventory.length >= inventoryLimit) {
                return interaction.editReply({
                    embeds: [
                        errorEmbed({
                            title: '🗑️ Inventory Full',
                            description: `Your aquarium is full! You can hold a maximum of ${inventoryLimit} creatures.\n\nRelease some creatures with \`/release\` to make room for new ones.`
                        })
                    ]
                });
            }
            
            // Create suspense with a small delay (500-1500ms)
            const suspenseTime = Math.floor(Math.random() * 1000) + 500;
            await new Promise(resolve => setTimeout(resolve, suspenseTime));
            
            // Determine if user catches anything
            const catchSuccess = Math.random() < config.catchGame.baseChance;
            
            if (!catchSuccess) {
                return interaction.editReply({
                    content: "You cast your net, but it comes back empty. Maybe try again later!"
                });
            }
            
            // Determine rarity based on configured chances
            const rarityRoll = Math.random();
            let rarity;
            
            if (rarityRoll < config.catchGame.rarityChances.legendary) {
                rarity = 'legendary';
            } else if (rarityRoll < config.catchGame.rarityChances.legendary + config.catchGame.rarityChances.epic) {
                rarity = 'epic';
            } else if (rarityRoll < config.catchGame.rarityChances.legendary + config.catchGame.rarityChances.epic + config.catchGame.rarityChances.rare) {
                rarity = 'rare';
            } else if (rarityRoll < config.catchGame.rarityChances.legendary + config.catchGame.rarityChances.epic + config.catchGame.rarityChances.rare + config.catchGame.rarityChances.uncommon) {
                rarity = 'uncommon';
            } else {
                rarity = 'common';
            }
            
            // Filter creatures by selected rarity
            const eligibleCreatures = seaCreatures.filter(creature => creature.rarity === rarity);
            
            // If no creatures of this rarity, fallback to common
            const creaturePool = eligibleCreatures.length > 0 ? eligibleCreatures : seaCreatures.filter(creature => creature.rarity === 'common');
            
            // Select a random creature from the pool
            const selectedCreature = creaturePool[Math.floor(Math.random() * creaturePool.length)];
            
            // Add slight variation to the creature
            const sizeVariation = Math.random() * 0.3 + 0.85; // Between 85% and 115% of original size
            const valueVariation = Math.random() * 0.3 + 0.85; // Between 85% and 115% of original value
            
            // Format the size with variation
            const originalSize = selectedCreature.size;
            let formattedSize;
            
            if (originalSize.includes('m')) {
                // For meter measurements
                const sizeParts = originalSize.split('-');
                if (sizeParts.length === 2) {
                    // Range like "3-4 m"
                    const min = parseFloat(sizeParts[0]);
                    const max = parseFloat(sizeParts[1].split(' ')[0]);
                    const actualSize = (min + (max - min) * Math.random()) * sizeVariation;
                    formattedSize = `${actualSize.toFixed(1)} m`;
                } else {
                    // Single measurement like "5 m"
                    const size = parseFloat(originalSize.split(' ')[0]) * sizeVariation;
                    formattedSize = `${size.toFixed(1)} m`;
                }
            } else if (originalSize.includes('cm')) {
                // For centimeter measurements
                const sizeParts = originalSize.split('-');
                if (sizeParts.length === 2) {
                    // Range like "10-15 cm"
                    const min = parseFloat(sizeParts[0]);
                    const max = parseFloat(sizeParts[1].split(' ')[0]);
                    const actualSize = Math.round((min + (max - min) * Math.random()) * sizeVariation);
                    formattedSize = `${actualSize} cm`;
                } else {
                    // Single measurement like "20 cm"
                    const size = Math.round(parseFloat(originalSize.split(' ')[0]) * sizeVariation);
                    formattedSize = `${size} cm`;
                }
            } else {
                // For unusual measurements
                formattedSize = originalSize;
            }
            
            // Calculate actual value with variation
            const value = Math.round(selectedCreature.value * valueVariation);
            
            // Create the caught creature object
            const caughtCreature = {
                ...selectedCreature,
                size: formattedSize,
                value,
                caught: new Date().toISOString()
            };
            
            // Add creature to user's inventory
            addInventoryItem(interaction.user.id, caughtCreature);
            
            // Add some currency as a bonus (only for common and uncommon)
            if (rarity === 'common' || rarity === 'uncommon') {
                const currencyBonus = Math.floor(value / 3);
                addCurrency(interaction.user.id, 'shells', currencyBonus);
            }
            
            // Create embed and send response
            const embed = creatureCaughtEmbed(caughtCreature, interaction.user);
            
            return interaction.editReply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in castnet command:', error);
            return interaction.editReply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'Something went wrong while casting your net. Please try again later.'
                    })
                ]
            });
        }
    }
};
