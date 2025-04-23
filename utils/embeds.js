const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Create a standard embed with our brand styling
function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || config.colors.primary);
    
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.timestamp) embed.setTimestamp();
    
    // Set author if provided
    if (options.author) {
        embed.setAuthor({
            name: options.author.name,
            iconURL: options.author.iconURL || null,
            url: options.author.url || null
        });
    }
    
    // Set footer (either custom or default)
    embed.setFooter({
        text: options.footer?.text || config.footerText,
        iconURL: options.footer?.iconURL || config.footerIcon
    });
    
    // Add fields if provided
    if (options.fields && Array.isArray(options.fields)) {
        options.fields.forEach(field => {
            embed.addFields({ 
                name: field.name, 
                value: field.value,
                inline: field.inline || false
            });
        });
    }
    
    return embed;
}

// Success embed
function successEmbed(options = {}) {
    return createEmbed({
        ...options,
        color: config.colors.success
    });
}

// Error embed
function errorEmbed(options = {}) {
    return createEmbed({
        ...options,
        color: config.colors.error
    });
}

// Warning embed
function warningEmbed(options = {}) {
    return createEmbed({
        ...options,
        color: config.colors.warning
    });
}

// Info embed
function infoEmbed(options = {}) {
    return createEmbed({
        ...options,
        color: config.colors.info
    });
}

// Moderation action embed
function moderationEmbed(options = {}) {
    return createEmbed({
        ...options,
        color: config.colors.moderation,
        timestamp: true
    });
}

// Ocean fact embed
function oceanFactEmbed(fact) {
    return createEmbed({
        title: `🌊 Ocean Fact #${fact.id}`,
        description: fact.content,
        color: config.colors.primary,
        timestamp: true,
        footer: {
            text: fact.isLore ? '🧜‍♀️ Ocean Lore' : '🐠 Ocean Fact'
        },
        thumbnail: 'https://cdn.discordapp.com/attachments/123456789/123456789/ocean.png' // Placeholder, would be replaced in production
    });
}

// Sea creature caught embed
function creatureCaughtEmbed(creature, user) {
    let rarityEmoji;
    switch(creature.rarity) {
        case 'common': rarityEmoji = '⚪'; break;
        case 'uncommon': rarityEmoji = '🟢'; break;
        case 'rare': rarityEmoji = '🔵'; break;
        case 'epic': rarityEmoji = '🟣'; break;
        case 'legendary': rarityEmoji = '🟡'; break;
    }
    
    return createEmbed({
        title: `${user.username} caught a ${creature.name}!`,
        description: `${rarityEmoji} **Rarity:** ${creature.rarity.charAt(0).toUpperCase() + creature.rarity.slice(1)}\n\n${creature.description}\n\n*"${creature.catchMessage}"*`,
        color: config.colors.primary,
        thumbnail: creature.imageUrl || null,
        timestamp: true,
        fields: [
            {
                name: '💰 Value',
                value: `${config.currency.symbol} ${creature.value} ${config.currency.name}`,
                inline: true
            },
            {
                name: '📊 Size',
                value: creature.size,
                inline: true
            }
        ]
    });
}

// Aquarium embed (showing a user's collection)
function aquariumEmbed(user, creatures, page, totalPages) {
    let description = '';
    
    if (creatures.length === 0) {
        description = "You haven't caught any sea creatures yet. Use `/castnet` to start fishing!";
    } else {
        creatures.forEach((creature, index) => {
            let rarityEmoji;
            switch(creature.rarity) {
                case 'common': rarityEmoji = '⚪'; break;
                case 'uncommon': rarityEmoji = '🟢'; break;
                case 'rare': rarityEmoji = '🔵'; break;
                case 'epic': rarityEmoji = '🟣'; break;
                case 'legendary': rarityEmoji = '🟡'; break;
            }
            
            const caughtDate = new Date(creature.caught).toLocaleDateString();
            description += `**${index + 1 + (page - 1) * 5}. ${creature.name}** ${rarityEmoji}\n`;
            description += `Size: ${creature.size} | Caught: ${caughtDate}\n`;
            description += `Value: ${config.currency.symbol} ${creature.value}\n\n`;
        });
    }
    
    return createEmbed({
        title: `🐠 ${user.username}'s Aquarium`,
        description,
        footer: {
            text: `Page ${page}/${totalPages || 1} • Total creatures: ${user.inventory?.length || 0}`
        }
    });
}

// Currency balance embed
function balanceEmbed(user) {
    return createEmbed({
        title: `${user.username}'s Treasure Chest`,
        description: `Here's what you've collected from the seas:`,
        thumbnail: user.displayAvatarURL(),
        fields: [
            {
                name: `${config.currency.symbol} ${config.currency.name}`,
                value: user.currency.shells.toString(),
                inline: true
            },
            {
                name: `${config.currency.premium.symbol} ${config.currency.premium.name}`,
                value: user.currency.pearls.toString(),
                inline: true
            },
            {
                name: '👑 Rank',
                value: user.rank || 'Beachcomber',
                inline: false
            },
            {
                name: '📊 Level',
                value: `Level ${user.level || 1} (${user.xp || 0} XP)`,
                inline: false
            }
        ]
    });
}

// Leaderboard embed
function leaderboardEmbed(users, type, guild) {
    let title, description, fieldName;
    
    switch(type) {
        case 'xp':
            title = '⭐ Experience Leaderboard';
            description = 'The most seasoned sailors in the server!';
            fieldName = 'Level & XP';
            break;
        case 'shells':
            title = `${config.currency.symbol} ${config.currency.name} Leaderboard`;
            description = 'Who has collected the most shells from the seafloor?';
            fieldName = `${config.currency.name}`;
            break;
        case 'pearls':
            title = `${config.currency.premium.symbol} ${config.currency.premium.name} Leaderboard`;
            description = 'The rarest treasures belong to these sailors!';
            fieldName = `${config.currency.premium.name}`;
            break;
        case 'creatures':
            title = '🐠 Creature Collection Leaderboard';
            description = 'The most accomplished marine biologists!';
            fieldName = 'Creatures Caught';
            break;
    }
    
    let leaderboardText = '';
    
    users.forEach((user, index) => {
        let valueText;
        let medal = '';
        
        // Add medals for top 3
        if (index === 0) medal = '🥇 ';
        else if (index === 1) medal = '🥈 ';
        else if (index === 2) medal = '🥉 ';
        else medal = `${index + 1}. `;
        
        switch(type) {
            case 'xp':
                valueText = `Level ${user.level} (${user.xp} XP)`;
                break;
            case 'shells':
                valueText = `${user.currency.shells} ${config.currency.symbol}`;
                break;
            case 'pearls':
                valueText = `${user.currency.pearls} ${config.currency.premium.symbol}`;
                break;
            case 'creatures':
                valueText = `${user.inventory?.length || 0} creatures`;
                break;
        }
        
        leaderboardText += `${medal}**${user.username || `<@${user.id}>`}** - ${valueText}\n`;
    });
    
    if (leaderboardText === '') {
        leaderboardText = 'No data available yet!';
    }
    
    return createEmbed({
        title,
        description,
        fields: [
            {
                name: fieldName,
                value: leaderboardText
            }
        ],
        footer: {
            text: `${guild.name} • Updated`
        },
        timestamp: true
    });
}

// Welcome embed
function welcomeEmbed(member, guild) {
    const db = require('./database');
    const guildData = db.getGuild(guild.id);
    
    let welcomeMessage = guildData.welcomeMessage || 'Welcome to {server}!';
    welcomeMessage = welcomeMessage
        .replace('{user}', member.toString())
        .replace('{username}', member.user.username)
        .replace('{server}', guild.name)
        .replace('{membercount}', guild.memberCount);
    
    return createEmbed({
        title: `Welcome to ${guild.name}!`,
        description: welcomeMessage,
        color: config.colors.primary,
        thumbnail: member.user.displayAvatarURL(),
        timestamp: true,
        image: guild.bannerURL() || null
    });
}

// Level up embed
function levelUpEmbed(user, newLevel, newRank) {
    return createEmbed({
        title: `🎉 Level Up!`,
        description: `Congratulations ${user.toString()}! You've reached **Level ${newLevel}**!`,
        color: config.colors.success,
        thumbnail: user.displayAvatarURL(),
        fields: [
            {
                name: 'New Rank',
                value: newRank,
                inline: true
            }
        ]
    });
}

// Rank embed (shows user's current rank/level)
function rankEmbed(user, userData) {
    return createEmbed({
        title: `${user.username}'s Ocean Rank`,
        description: `Current progression on the seven seas`,
        thumbnail: user.displayAvatarURL(),
        fields: [
            {
                name: '👑 Rank',
                value: userData.rank || 'Beachcomber',
                inline: true
            },
            {
                name: '⭐ Level',
                value: userData.level.toString(),
                inline: true
            },
            {
                name: '📊 XP',
                value: `${userData.xp}/${userData.level * config.xp.levelMultiplier} XP`,
                inline: true
            }
        ]
    });
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    moderationEmbed,
    oceanFactEmbed,
    creatureCaughtEmbed,
    aquariumEmbed,
    balanceEmbed,
    leaderboardEmbed,
    welcomeEmbed,
    levelUpEmbed,
    rankEmbed
};
