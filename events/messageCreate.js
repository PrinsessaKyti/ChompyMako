const { addXP } = require('../utils/database');
const { levelUpEmbed } = require('../utils/embeds');
const config = require('../config');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore messages from bots or non-guild messages
        if (message.author.bot || !message.guild) return;
        
        // Award XP for messages (with cooldown)
        handleXP(message);
    }
};

async function handleXP(message) {
    try {
        // Get user data
        const db = require('../utils/database');
        const userData = db.getUser(message.author.id);
        
        // Check cooldown (default 1 minute between XP gains)
        const now = Date.now();
        const cooldownAmount = config.xp.cooldown;
        
        if (userData.lastMessageTime && now - userData.lastMessageTime < cooldownAmount) {
            return; // Still on cooldown
        }
        
        // Generate random XP amount
        const xpAmount = Math.floor(
            Math.random() * (config.xp.messageXP.max - config.xp.messageXP.min + 1) + 
            config.xp.messageXP.min
        );
        
        // Add XP and check for level up
        const result = addXP(message.author.id, xpAmount);
        
        // If user leveled up, send a message
        if (result.leveledUp) {
            const embed = levelUpEmbed(message.author, result.newLevel, result.newRank);
            
            try {
                // Try to send in the same channel
                await message.channel.send({
                    embeds: [embed],
                    content: message.author.toString()
                });
            } catch (error) {
                console.error(`Error sending level up message for ${message.author.tag}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error processing XP for message from ${message.author.tag}:`, error);
    }
}
