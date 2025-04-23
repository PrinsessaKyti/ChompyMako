const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getFactTracking, updateFactTracking } = require('../utils/database');
const { oceanFactEmbed } = require('../utils/embeds');
const oceanFacts = require('../data/oceanFacts');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        
        // Set bot activity
        client.user.setActivity('the waves 🌊', { type: 3 }); // 3 is "Watching"
        
        // Register slash commands
        try {
            // Collect all command data
            const commands = [];
            const commandFolders = fs.readdirSync(path.join(__dirname, '../commands'));
            
            for (const folder of commandFolders) {
                const commandFiles = fs.readdirSync(path.join(__dirname, '../commands', folder)).filter(file => file.endsWith('.js'));
                
                for (const file of commandFiles) {
                    const command = require(path.join(__dirname, '../commands', folder, file));
                    if (command.data) {
                        commands.push(command.data.toJSON());
                    }
                }
            }
            
            console.log(`Started refreshing ${commands.length} application (/) commands.`);
            
            // Check if we have valid credentials for API
            if (!config.token || config.token === 'your-token-here') {
                console.log('No valid token found. Commands will not be registered.');
                return;
            }
            
            // Get client ID from the bot itself if not in config
            const clientId = config.clientId || client.user.id;
            if (!clientId) {
                console.log('No valid client ID found. Commands will not be registered.');
                return;
            }
            
            const rest = new REST({ version: '10' }).setToken(config.token);
            
            // If guildId is provided and valid, register commands to that guild only (for development)
            if (config.guildId && config.guildId.length > 0) {
                await rest.put(
                    Routes.applicationGuildCommands(clientId, config.guildId),
                    { body: commands },
                );
                console.log(`Successfully registered commands for development guild ${config.guildId}`);
            } else {
                // Register commands globally (takes up to an hour to propagate)
                await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commands },
                );
                console.log('Successfully registered commands globally');
            }
        } catch (error) {
            console.error('Error registering slash commands:', error);
        }
        
        // Set up daily ocean fact scheduler
        setupDailyFactScheduler(client);
    }
};

// Function to schedule and send the daily ocean fact
function setupDailyFactScheduler(client) {
    // Check every minute for the scheduled time
    setInterval(() => {
        const now = new Date();
        const factConfig = config.oceanFacts;
        
        if (now.getHours() === factConfig.dailyFactHour && now.getMinutes() === factConfig.dailyFactMinute) {
            // Check if we already sent a fact today
            const factTracking = getFactTracking();
            const lastSent = factTracking.lastSent ? new Date(factTracking.lastSent) : null;
            
            // If we haven't sent a fact today (or never sent one)
            if (!lastSent || now.toDateString() !== lastSent.toDateString()) {
                sendDailyFact(client);
            }
        }
    }, 60000); // Check every minute
}

// Function to send the daily ocean fact to all servers
async function sendDailyFact(client) {
    try {
        const factTracking = getFactTracking();
        let factIndex = factTracking.factIndex || 0;
        
        // Move to the next fact
        factIndex = (factIndex + 1) % oceanFacts.length;
        
        // Get the fact
        const fact = oceanFacts[factIndex];
        
        // Create the embed
        const embed = oceanFactEmbed(fact);
        
        // Send to each guild with the configured channel
        client.guilds.cache.forEach(async (guild) => {
            try {
                const db = require('../utils/database');
                const guildData = db.getGuild(guild.id);
                
                // Get the channel to send to (either from guild settings or default)
                const channelName = guildData.dailyFactChannel || config.oceanFacts.dailyFactChannel;
                const channel = guild.channels.cache.find(c => 
                    c.name.toLowerCase() === channelName.toLowerCase() && c.isTextBased()
                );
                
                if (channel) {
                    await channel.send({ embeds: [embed] });
                    console.log(`Sent daily ocean fact to ${guild.name} (#${channel.name})`);
                }
            } catch (err) {
                console.error(`Error sending daily fact to guild ${guild.name}:`, err);
            }
        });
        
        // Update the tracking data
        updateFactTracking(factIndex);
        
    } catch (error) {
        console.error('Error sending daily ocean fact:', error);
    }
}
