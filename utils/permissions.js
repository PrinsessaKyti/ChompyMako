// Function to check if a user has a specific permission
function checkPermission(member, permission) {
    if (!member) return false;
    
    // Check for administrator permission which overrides all others
    if (member.permissions.has('Administrator')) return true;
    
    // Check for the specific permission
    return member.permissions.has(permission);
}

// Function to check if the bot has necessary permissions
function checkBotPermissions(guild, channel, requiredPermissions) {
    const botMember = guild.members.cache.get(guild.client.user.id);
    
    if (!botMember) return { hasPermission: false, missing: ['Unable to find bot member'] };
    
    const missingPermissions = [];
    
    for (const permission of requiredPermissions) {
        // Check global permissions
        if (!botMember.permissions.has(permission)) {
            missingPermissions.push(permission);
            continue;
        }
        
        // Check channel-specific permissions if channel is provided
        if (channel) {
            const channelPermissions = channel.permissionsFor(botMember);
            if (!channelPermissions.has(permission)) {
                missingPermissions.push(`${permission} (in #${channel.name})`);
            }
        }
    }
    
    return {
        hasPermission: missingPermissions.length === 0,
        missing: missingPermissions
    };
}

// Helper function to check if the member is a moderator
function isModerator(member) {
    if (!member) return false;
    
    // Administrator always counts as a moderator
    if (member.permissions.has('Administrator')) return true;
    
    // Check for common moderator permissions
    const modPermissions = [
        'BanMembers',
        'KickMembers',
        'ManageMessages',
        'ManageChannels',
        'ManageRoles'
    ];
    
    // If they have any of these permissions, consider them a moderator
    return modPermissions.some(permission => member.permissions.has(permission));
}

// Function to check if a user can run a moderation command
function canModerate(member, targetMember) {
    // Check if the user is attempting to moderate themselves
    if (member.id === targetMember.id) return false;
    
    // Check if the user has permission to moderate
    if (!isModerator(member)) return false;
    
    // Check if the target is the server owner
    if (targetMember.id === member.guild.ownerId) return false;
    
    // Check if the bot's role is lower than the target's highest role
    if (targetMember.roles.highest.position >= member.roles.highest.position) return false;
    
    return true;
}

// Function to check if the bot can moderate a user
function botCanModerate(guild, targetMember) {
    const botMember = guild.members.cache.get(guild.client.user.id);
    
    if (!botMember) return false;
    
    // Check if the target is the server owner
    if (targetMember.id === guild.ownerId) return false;
    
    // Check if the bot's highest role is lower than the target's highest role
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) return false;
    
    return true;
}

module.exports = {
    checkPermission,
    checkBotPermissions,
    isModerator,
    canModerate,
    botCanModerate
};
