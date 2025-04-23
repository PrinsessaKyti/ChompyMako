const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser } = require('../../utils/database');
const { aquariumEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aquarium')
        .setDescription('View your collected sea creatures')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('View another user\'s aquarium')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            // Get target user (either mentioned or self)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const targetData = getUser(targetUser.id);
            
            // Check if the user has any creatures
            if (!targetData.inventory || targetData.inventory.length === 0) {
                return interaction.reply({
                    embeds: [
                        aquariumEmbed(targetUser, [], 1, 1)
                    ]
                });
            }
            
            // Sort creatures by rarity and then by name
            const sortedInventory = [...targetData.inventory].sort((a, b) => {
                const rarityOrder = { 'legendary': 0, 'epic': 1, 'rare': 2, 'uncommon': 3, 'common': 4 };
                
                // First sort by rarity
                if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
                    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
                }
                
                // Then sort by name
                return a.name.localeCompare(b.name);
            });
            
            // Set up pagination
            const itemsPerPage = 5;
            const totalPages = Math.ceil(sortedInventory.length / itemsPerPage);
            let currentPage = 1;
            
            // Create initial embed
            const displayedCreatures = sortedInventory.slice(0, itemsPerPage);
            const embed = aquariumEmbed(targetUser, displayedCreatures, currentPage, totalPages);
            
            // Create pagination buttons if there's more than one page
            const getButtons = (currentPage) => {
                const row = new ActionRowBuilder();
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aquarium-first|${targetUser.id}`)
                        .setLabel('First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1)
                );
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aquarium-prev|${targetUser.id}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1)
                );
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aquarium-next|${targetUser.id}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages)
                );
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aquarium-last|${targetUser.id}`)
                        .setLabel('Last')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );
                
                return row;
            };
            
            // Send initial message with buttons if there's more than one page
            const message = totalPages > 1 
                ? await interaction.reply({ embeds: [embed], components: [getButtons(currentPage)], fetchReply: true })
                : await interaction.reply({ embeds: [embed] });
            
            // If only one page, no need for a collector
            if (totalPages <= 1) return;
            
            // Create button collector
            const collector = message.createMessageComponentCollector({ 
                time: 3 * 60 * 1000 // 3 minutes
            });
            
            // Handle button interactions
            collector.on('collect', async (i) => {
                // Verify that the user who clicked is the command user
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: "This isn't your aquarium display!",
                        ephemeral: true 
                    });
                }
                
                // Get fresh data in case it changed
                const freshData = getUser(targetUser.id);
                const freshInventory = [...freshData.inventory].sort((a, b) => {
                    const rarityOrder = { 'legendary': 0, 'epic': 1, 'rare': 2, 'uncommon': 3, 'common': 4 };
                    
                    // First sort by rarity
                    if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
                        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
                    }
                    
                    // Then sort by name
                    return a.name.localeCompare(b.name);
                });
                
                // Parse the customId
                const [action] = i.customId.split('|');
                
                // Update page based on button
                if (action === 'aquarium-first') {
                    currentPage = 1;
                } else if (action === 'aquarium-prev') {
                    currentPage = Math.max(1, currentPage - 1);
                } else if (action === 'aquarium-next') {
                    currentPage = Math.min(totalPages, currentPage + 1);
                } else if (action === 'aquarium-last') {
                    currentPage = totalPages;
                }
                
                // Update the displayed creatures
                const startIndex = (currentPage - 1) * itemsPerPage;
                const displayedCreatures = freshInventory.slice(startIndex, startIndex + itemsPerPage);
                
                // Update the embed
                const updatedEmbed = aquariumEmbed(targetUser, displayedCreatures, currentPage, totalPages);
                
                // Update message
                await i.update({ embeds: [updatedEmbed], components: [getButtons(currentPage)] });
            });
            
            // Handle collector end
            collector.on('end', async () => {
                try {
                    // Disable all buttons when collector expires
                    const disabledRow = new ActionRowBuilder();
                    const components = getButtons(currentPage).components;
                    
                    for (const button of components) {
                        disabledRow.addComponents(
                            ButtonBuilder.from(button).setDisabled(true)
                        );
                    }
                    
                    await message.edit({ components: [disabledRow] });
                } catch (error) {
                    console.error('Error disabling buttons:', error);
                }
            });
            
        } catch (error) {
            console.error('Error in aquarium command:', error);
            return interaction.reply({
                embeds: [
                    errorEmbed({
                        title: 'Error',
                        description: 'Something went wrong while viewing the aquarium. Please try again later.'
                    })
                ],
                ephemeral: true
            });
        }
    }
};

// Add button handler for pagination
const aquariumButtonHandler = {
    customId: 'aquarium',
    async execute(interaction, client, args) {
        // This function will be called by the button handler
        // Implementation will be similar to the button collector's collect event
    }
};
