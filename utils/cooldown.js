const { Collection } = require('discord.js');
const config = require('../config');

// Check if a command is on cooldown and handle the response
function handleCooldown(interaction, commandName, cooldowns) {
    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Collection());
    }
    
    const now = Date.now();
    const timestamps = cooldowns.get(commandName);
    const cooldownAmount = config.cooldowns[commandName] || 3000; // Default 3 seconds
    
    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            
            // Format time left in a human-readable format
            let timeString;
            if (timeLeft < 60) {
                timeString = `${Math.ceil(timeLeft)} second(s)`;
            } else if (timeLeft < 3600) {
                timeString = `${Math.ceil(timeLeft / 60)} minute(s)`;
            } else {
                timeString = `${Math.ceil(timeLeft / 3600)} hour(s)`;
            }
            
            return {
                onCooldown: true,
                timeLeft: timeString
            };
        }
    }
    
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    
    return {
        onCooldown: false
    };
}

// Reset a specific cooldown
function resetCooldown(userId, commandName, cooldowns) {
    if (!cooldowns.has(commandName)) return false;
    
    const timestamps = cooldowns.get(commandName);
    if (!timestamps.has(userId)) return false;
    
    timestamps.delete(userId);
    return true;
}

// Set a custom cooldown duration
function setCooldown(userId, commandName, duration, cooldowns) {
    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Collection());
    }
    
    const timestamps = cooldowns.get(commandName);
    const now = Date.now();
    
    timestamps.set(userId, now - config.cooldowns[commandName] + duration);
}

module.exports = {
    handleCooldown,
    resetCooldown,
    setCooldown
};
