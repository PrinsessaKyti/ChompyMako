const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display a list of available commands')
        .addStringOption(option => 
            option.setName('command')
                .setDescription('Get detailed information about a specific command')
                .setRequired(false)
                .setAutocomplete(true)),
    
    async execute(interaction) {
        try {
            // Get the specific command if requested
            const commandName = interaction.options.getString('command');
            
            // If a specific command was requested, show detailed help for it
            if (commandName) {
                const command = interaction.client.commands.get(commandName);
                
                // If command doesn't exist, return an error
                if (!command) {
                    return interaction.reply({
                        content: `I couldn't find a command called "${commandName}".`,
                        ephemeral: true
                    });
                }
                
                // Create detailed help embed for the command
                const embed = createEmbed({
                    title: `Command: /${command.data.name}`,
                    description: command.data.description,
                    fields: [
                        {
                            name: 'Usage',
                            value: getCommandUsage(command)
                        }
                    ],
                    footer: {
                        text: 'Syntax: <required> [optional]'
                    }
                });
                
                return interaction.reply({
                    embeds: [embed]
                });
            }
            
            // Otherwise, show the main help menu
            // Get all command categories by folder names
            const commandFolders = fs.readdirSync(path.join(__dirname, '../')).filter(folder => {
                return fs.statSync(path.join(__dirname, '../', folder)).isDirectory();
            });
            
            // Create an embed for the main help menu
            const embed = createEmbed({
                title: '🌊 Ocean Bot Help',
                description: 'Here are all the available commands, grouped by category.\nUse `/help [command]` to get detailed information about a specific command.',
                thumbnail: interaction.client.user.displayAvatarURL(),
            });
            
            // Add fields for each category
            for (const folder of commandFolders) {
                // Get all commands in this category
                const commandFiles = fs.readdirSync(path.join(__dirname, '../', folder)).filter(file => file.endsWith('.js'));
                
                // Skip if category is empty
                if (commandFiles.length === 0) continue;
                
                // Format category name for display
                const categoryName = folder.charAt(0).toUpperCase() + folder.slice(1);
                let commandList = '';
                
                // Get list of commands in this category
                for (const file of commandFiles) {
                    const command = require(`../${folder}/${file}`);
                    // Skip if command doesn't have data or name
                    if (!command.data || !command.data.name) continue;
                    
                    commandList += `\`/${command.data.name}\` - ${command.data.description}\n`;
                }
                
                // Add category as a field
                embed.addFields({
                    name: getCategoryEmoji(folder) + ' ' + categoryName,
                    value: commandList
                });
            }
            
            return interaction.reply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in help command:', error);
            return interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        }
    },
    
    // Handle autocomplete for command option
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        let choices = [];
        
        // Get all available commands
        interaction.client.commands.forEach(command => {
            choices.push({
                name: command.data.name,
                value: command.data.name
            });
        });
        
        // Filter choices based on user input
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue))
                               .slice(0, 25); // Discord limits autocomplete options to 25
        
        await interaction.respond(filtered);
    }
};

// Helper function to get command usage
function getCommandUsage(command) {
    let usage = `/${command.data.name}`;
    
    if (command.data.options && command.data.options.length > 0) {
        for (const option of command.data.options) {
            if (option.required) {
                usage += ` <${option.name}>`;
            } else {
                usage += ` [${option.name}]`;
            }
        }
    }
    
    return usage;
}

// Helper function to get a category emoji
function getCategoryEmoji(category) {
    const emojiMap = {
        'fun': '🎮',
        'economy': '💰',
        'moderation': '🛡️',
        'utility': '🔧',
        'admin': '⚙️'
    };
    
    return emojiMap[category] || '📝';
}
