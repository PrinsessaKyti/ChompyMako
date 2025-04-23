const fs = require('fs');
const path = require('path');

// Function to check command options ordering
function checkCommandOptions(commandPath) {
    try {
        // Load the command file
        const command = require(commandPath);
        if (!command.data || !command.data.options) {
            return null; // No options to check
        }
        
        // Extract options from command
        const options = command.data.options;
        
        // Check if there are any required options after optional ones
        let foundOptional = false;
        let issues = [];

        options.forEach((option, index) => {
            if (option.required === false) {
                foundOptional = true;
            } else if (option.required === true && foundOptional) {
                issues.push(`Option ${option.name} is required but comes after optional options`);
            }
        });
        
        if (issues.length > 0) {
            return {
                command: command.data.name,
                path: commandPath,
                issues: issues
            };
        }
        
        return null; // No issues found
    } catch (error) {
        return {
            command: commandPath,
            path: commandPath,
            issues: [`Error analyzing command: ${error.message}`]
        };
    }
}

// Walk through all command files
const commandsDir = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsDir);

let commandsWithIssues = [];

commandFolders.forEach(folder => {
    const categoryDir = path.join(commandsDir, folder);
    const commandFiles = fs.readdirSync(categoryDir).filter(file => file.endsWith('.js'));
    
    commandFiles.forEach(file => {
        const commandPath = path.join(categoryDir, file);
        const issues = checkCommandOptions(commandPath);
        
        if (issues) {
            commandsWithIssues.push(issues);
        }
    });
});

// Print results
if (commandsWithIssues.length > 0) {
    console.log('Commands with required options after optional ones:');
    commandsWithIssues.forEach(cmd => {
        console.log(`\n${cmd.command} (${cmd.path}):`);
        cmd.issues.forEach(issue => console.log(`  - ${issue}`));
    });
} else {
    console.log('No commands found with required options after optional ones.');
}