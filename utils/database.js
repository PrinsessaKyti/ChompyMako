const fs = require('fs');
const path = require('path');

// In-memory database
const db = {
    users: new Map(),
    guilds: new Map(),
    modActions: new Map(),
    dailyFacts: { lastSent: null, factIndex: 0 }
};

// Ensure data directory exists
const dataDir = path.join(__dirname, '../db');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// File paths
const USERS_PATH = path.join(dataDir, 'users.json');
const GUILDS_PATH = path.join(dataDir, 'guilds.json');
const MOD_ACTIONS_PATH = path.join(dataDir, 'modActions.json');
const DAILY_FACTS_PATH = path.join(dataDir, 'dailyFacts.json');

// Initialize the database
function initDatabase() {
    try {
        // Load users
        if (fs.existsSync(USERS_PATH)) {
            const userData = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
            for (const [id, user] of Object.entries(userData)) {
                db.users.set(id, user);
            }
            console.log(`Loaded ${db.users.size} users from database`);
        }

        // Load guilds
        if (fs.existsSync(GUILDS_PATH)) {
            const guildData = JSON.parse(fs.readFileSync(GUILDS_PATH, 'utf8'));
            for (const [id, guild] of Object.entries(guildData)) {
                db.guilds.set(id, guild);
            }
            console.log(`Loaded ${db.guilds.size} guilds from database`);
        }

        // Load moderation actions
        if (fs.existsSync(MOD_ACTIONS_PATH)) {
            const modActionsData = JSON.parse(fs.readFileSync(MOD_ACTIONS_PATH, 'utf8'));
            for (const [id, actions] of Object.entries(modActionsData)) {
                db.modActions.set(id, actions);
            }
            console.log(`Loaded moderation actions for ${db.modActions.size} servers`);
        }

        // Load daily facts tracking
        if (fs.existsSync(DAILY_FACTS_PATH)) {
            db.dailyFacts = JSON.parse(fs.readFileSync(DAILY_FACTS_PATH, 'utf8'));
            console.log(`Loaded daily facts tracking data`);
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Save all data to disk
function saveAllData() {
    try {
        // Save users
        const userData = {};
        for (const [id, user] of db.users.entries()) {
            userData[id] = user;
        }
        fs.writeFileSync(USERS_PATH, JSON.stringify(userData, null, 2));

        // Save guilds
        const guildData = {};
        for (const [id, guild] of db.guilds.entries()) {
            guildData[id] = guild;
        }
        fs.writeFileSync(GUILDS_PATH, JSON.stringify(guildData, null, 2));

        // Save moderation actions
        const modActionsData = {};
        for (const [id, actions] of db.modActions.entries()) {
            modActionsData[id] = actions;
        }
        fs.writeFileSync(MOD_ACTIONS_PATH, JSON.stringify(modActionsData, null, 2));

        // Save daily facts tracking
        fs.writeFileSync(DAILY_FACTS_PATH, JSON.stringify(db.dailyFacts, null, 2));

        return true;
    } catch (error) {
        console.error('Error saving database:', error);
        return false;
    }
}

// User data functions
function getUser(userId) {
    if (!db.users.has(userId)) {
        const newUser = {
            id: userId,
            currency: {
                shells: 0,
                pearls: 0
            },
            inventory: [],
            xp: 0,
            level: 1,
            lastMessageTime: 0,
            joinDate: new Date().toISOString(),
            rank: 'Beachcomber', // Starting rank
            warnings: []
        };
        db.users.set(userId, newUser);
    }
    return db.users.get(userId);
}

function updateUser(userId, updates) {
    const user = getUser(userId);
    db.users.set(userId, { ...user, ...updates });
    return db.users.get(userId);
}

function addCurrency(userId, type, amount) {
    const user = getUser(userId);
    
    if (type === 'shells') {
        user.currency.shells += amount;
    } else if (type === 'pearls') {
        user.currency.pearls += amount;
    }
    
    db.users.set(userId, user);
    return user.currency;
}

function addInventoryItem(userId, item) {
    const user = getUser(userId);
    
    // Add the new item
    user.inventory.push({
        ...item,
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        caught: new Date().toISOString()
    });
    
    db.users.set(userId, user);
    return user.inventory;
}

function removeInventoryItem(userId, itemId) {
    const user = getUser(userId);
    
    const index = user.inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
        user.inventory.splice(index, 1);
        db.users.set(userId, user);
        return true;
    }
    
    return false;
}

function addXP(userId, amount) {
    const user = getUser(userId);
    
    user.xp += amount;
    user.lastMessageTime = Date.now();
    
    // Check for level up
    const config = require('../config');
    const newLevel = Math.floor(Math.sqrt(user.xp / config.xp.levelMultiplier)) + 1;
    
    const leveledUp = newLevel > user.level;
    if (leveledUp) {
        user.level = newLevel;
        
        // Update rank if needed
        const ranks = require('../data/ranks');
        const newRank = ranks.find(rank => rank.level <= newLevel);
        if (newRank && newRank.name !== user.rank) {
            user.rank = newRank.name;
        }
    }
    
    db.users.set(userId, user);
    
    return {
        leveledUp,
        newLevel: user.level,
        newRank: user.rank
    };
}

// Guild settings functions
function getGuild(guildId) {
    if (!db.guilds.has(guildId)) {
        const newGuild = {
            id: guildId,
            welcomeChannel: null,
            logsChannel: null,
            welcomeMessage: 'Ahoy, {user}! Welcome aboard the {server} ship! Enjoy sailing the digital seas with us! 🌊',
            autoRoles: []
        };
        db.guilds.set(guildId, newGuild);
    }
    return db.guilds.get(guildId);
}

function updateGuild(guildId, updates) {
    const guild = getGuild(guildId);
    db.guilds.set(guildId, { ...guild, ...updates });
    return db.guilds.get(guildId);
}

// Moderation functions
function addModAction(guildId, action) {
    if (!db.modActions.has(guildId)) {
        db.modActions.set(guildId, []);
    }
    
    const actions = db.modActions.get(guildId);
    actions.push({
        ...action,
        timestamp: Date.now()
    });
    
    db.modActions.set(guildId, actions);
    return actions;
}

function getModActions(guildId, targetId = null) {
    if (!db.modActions.has(guildId)) {
        return [];
    }
    
    const actions = db.modActions.get(guildId);
    
    if (targetId) {
        return actions.filter(action => action.targetId === targetId);
    }
    
    return actions;
}

function addWarning(userId, guildId, reason, moderatorId) {
    const user = getUser(userId);
    
    const warning = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        reason,
        timestamp: Date.now(),
        moderatorId
    };
    
    if (!user.warnings) {
        user.warnings = [];
    }
    
    user.warnings.push(warning);
    db.users.set(userId, user);
    
    // Also add to mod actions
    addModAction(guildId, {
        type: 'warning',
        targetId: userId,
        moderatorId,
        reason
    });
    
    return user.warnings;
}

function getWarnings(userId) {
    const user = getUser(userId);
    return user.warnings || [];
}

function removeWarning(userId, warningId) {
    const user = getUser(userId);
    
    if (!user.warnings) {
        return false;
    }
    
    const index = user.warnings.findIndex(warning => warning.id === warningId);
    if (index !== -1) {
        user.warnings.splice(index, 1);
        db.users.set(userId, user);
        return true;
    }
    
    return false;
}

// Daily fact tracking
function updateFactTracking(index) {
    db.dailyFacts.lastSent = Date.now();
    db.dailyFacts.factIndex = index;
    return db.dailyFacts;
}

function getFactTracking() {
    return db.dailyFacts;
}

// User ranking/leaderboard functions
function getTopUsers(guildId, client, type = 'xp', limit = 10) {
    const users = Array.from(db.users.values());
    
    // Filter users that are in the specified guild
    const guild = client.guilds.cache.get(guildId);
    const guildUsers = users.filter(user => {
        const member = guild.members.cache.get(user.id);
        return !!member;
    });
    
    // Sort based on the specified type
    if (type === 'xp') {
        guildUsers.sort((a, b) => b.xp - a.xp);
    } else if (type === 'shells') {
        guildUsers.sort((a, b) => b.currency.shells - a.currency.shells);
    } else if (type === 'pearls') {
        guildUsers.sort((a, b) => b.currency.pearls - a.currency.pearls);
    } else if (type === 'creatures') {
        guildUsers.sort((a, b) => (b.inventory?.length || 0) - (a.inventory?.length || 0));
    }
    
    return guildUsers.slice(0, limit);
}

module.exports = {
    initDatabase,
    saveAllData,
    getUser,
    updateUser,
    addCurrency,
    addInventoryItem,
    removeInventoryItem,
    addXP,
    getGuild,
    updateGuild,
    addModAction,
    getModActions,
    addWarning,
    getWarnings,
    removeWarning,
    updateFactTracking,
    getFactTracking,
    getTopUsers
};
