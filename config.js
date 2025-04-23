module.exports = {
    token: process.env.DISCORD_TOKEN || 'your-token-here',
    clientId: process.env.CLIENT_ID || '', // Empty string when not available
    guildId: process.env.GUILD_ID || '', // Empty string when not available
    
    // Default channels (can be overridden per server)
    welcomeChannel: 'welcome',
    logsChannel: 'mod-logs',
    
    // Currency configuration
    currency: {
        name: 'Shells',
        symbol: '🐚',
        premium: {
            name: 'Pearls',
            symbol: '💎',
            conversionRate: 100 // 100 shells = 1 pearl
        }
    },
    
    // XP system configuration
    xp: {
        messageXP: {
            min: 5,
            max: 15
        },
        levelMultiplier: 300, // xp needed = level * multiplier
        cooldown: 60000 // 1 minute between XP gains
    },
    
    // Cooldowns (in milliseconds)
    cooldowns: {
        castnet: 3 * 60 * 1000, // 3 minutes
        oceanfact: 30 * 1000, // 30 seconds
        pingkraken: 5 * 60 * 1000, // 5 minutes
        report: 5 * 60 * 1000, // 5 minutes
        embedmessage: 10 * 60 * 1000, // 10 minutes
        voyage: 15 * 60 * 1000 // 15 minutes
    },
    
    // Moderation settings
    moderation: {
        maxWarnings: 3, // Number of warnings before auto-action
        autoAction: 'mute', // What happens after max warnings: 'mute', 'kick', 'ban'
        muteDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        defaultReasons: {
            ban: 'Violation of server rules',
            kick: 'Repeated rule violations',
            mute: 'Disruptive behavior',
            warn: 'Minor rule violation'
        }
    },
    
    // Ocean fact feature settings
    oceanFacts: {
        dailyFactHour: 8, // Hour of the day (0-23) to send daily fact
        dailyFactMinute: 0, // Minute of the hour (0-59) to send daily fact
        dailyFactChannel: 'ocean-facts' // Default channel for daily facts
    },
    
    // Game settings
    catchGame: {
        baseChance: 0.8, // 80% chance to catch something
        rarityChances: {
            common: 0.6,
            uncommon: 0.3, 
            rare: 0.08,
            epic: 0.018,
            legendary: 0.002
        },
        inventoryLimit: 50, // Maximum creatures in inventory
        sellMultipliers: {
            common: 1,
            uncommon: 2, 
            rare: 5,
            epic: 15,
            legendary: 50
        }
    },
    
    // Colors for embeds
    colors: {
        primary: '#1DA1F2', // Ocean blue
        success: '#43B581', // Green
        error: '#F04747',   // Red
        warning: '#FAA61A', // Amber
        info: '#7289DA',    // Blurple
        moderation: '#FF6961' // Light red for moderation actions
    },
    
    // Default embed footer text
    footerText: '🌊 Ocean Bot | Sailing the Digital Seas',
    
    // Default embed footer icon URL (empty for now - would be a Discord CDN URL in production)
    footerIcon: ''
};
