const { handleCooldown } = require('../utils/cooldown');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            try {
                // Check for cooldown
                if (command.cooldown) {
                    const cooldownCheck = handleCooldown(interaction, command.data.name, client.cooldowns);
                    
                    if (cooldownCheck.onCooldown) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed({
                                    title: '⏳ Command on Cooldown',
                                    description: `You need to wait ${cooldownCheck.timeLeft} before using \`/${command.data.name}\` again.`
                                })
                            ],
                            ephemeral: true
                        });
                    }
                }
                
                // Execute the command
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
                
                // Reply with an error message if the interaction hasn't been replied to yet
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        embeds: [
                            errorEmbed({
                                title: '⚠️ Error',
                                description: 'There was an error while executing this command! The developers have been notified.'
                            })
                        ],
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        embeds: [
                            errorEmbed({
                                title: '⚠️ Error',
                                description: 'There was an error while executing this command! The developers have been notified.'
                            })
                        ],
                        ephemeral: true
                    });
                }
            }
        }
        
        // Handle button interactions
        else if (interaction.isButton()) {
            const [customId, ...args] = interaction.customId.split('|');
            const button = client.buttons.get(customId);
            
            if (!button) return;
            
            try {
                await button.execute(interaction, client, args);
            } catch (error) {
                console.error(`Error executing button ${customId}`);
                console.error(error);
                
                await interaction.reply({
                    embeds: [
                        errorEmbed({
                            title: '⚠️ Button Error',
                            description: 'There was an error while processing this button! The developers have been notified.'
                        })
                    ],
                    ephemeral: true
                });
            }
        }
        
        // Handle select menu interactions
        else if (interaction.isStringSelectMenu()) {
            // Handle select menu interactions here if needed
        }
        
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            // Handle modal submissions here if needed
        }
    }
};
