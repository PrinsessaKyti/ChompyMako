// Ocean Bot - Main Entry Point
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.js');
const { initDatabase, saveAllData } = require('./utils/database.js');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User
    ]
});

// Initialize collections
client.commands = new Collection();
client.cooldowns = new Collection();
client.buttons = new Collection();

// Load commands
const loadCommands = (dir) => {
    const commandFolders = fs.readdirSync(path.join(__dirname, dir));
    
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, dir, folder)).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const command = require(path.join(__dirname, dir, folder, file));
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️ Command at ${dir}/${folder}/${file} is missing required properties.`);
            }
        }
    }
};

// Load events
const loadEvents = (dir) => {
    const eventFiles = fs.readdirSync(path.join(__dirname, dir)).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const event = require(path.join(__dirname, dir, file));
        const eventName = file.split('.')[0];
        
        if (event.once) {
            client.once(eventName, (...args) => event.execute(...args, client));
        } else {
            client.on(eventName, (...args) => event.execute(...args, client));
        }
        
        console.log(`✅ Loaded event: ${eventName}`);
    }
};

// Initialize the database before login
initDatabase();

// Load commands and events
loadCommands('commands');
loadEvents('events');

// Set up interval to save data every 5 minutes
setInterval(() => {
    saveAllData();
    console.log('Saved all data to disk');
}, 5 * 60 * 1000);

// Handle process termination to save data
process.on('SIGINT', () => {
    console.log('Bot shutting down...');
    saveAllData();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    saveAllData();
});

// Log in to Discord
client.login(config.token)
    .then(() => console.log('🌊 Ocean Bot is sailing the digital seas!'))
    .catch(err => console.error('Failed to connect to Discord:', err));
