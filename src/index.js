#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const Journal = require('./journal');
const Analytics = require('./analytics');
const { displayWelcome, displayStats } = require('./ui');

program
  .version('1.0.0')
  .description('Daily Dev Journal - Track your development progress and productivity');

program
  .command('entry')
  .description('Create a new journal entry')
  .option('-m, --message <message>', 'Quick entry message')
  .option('-t, --type <type>', 'Entry type (learning, project, bug-fix, feature)')
  .action(async (options) => {
    const journal = new Journal();
    try {
      await journal.createEntry(options);
      console.log(chalk.green('✅ Journal entry created successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error creating entry:', error.message));
    }
  });

program
  .command('stats')
  .description('Display development statistics')
  .option('-d, --days <days>', 'Number of days to analyze', '30')
  .action(async (options) => {
    const analytics = new Analytics();
    try {
      const stats = await analytics.generateStats(parseInt(options.days));
      displayStats(stats);
    } catch (error) {
      console.error(chalk.red('❌ Error generating stats:', error.message));
    }
  });

program
  .command('goals')
  .description('Manage learning goals and track progress')
  .option('-a, --add <goal>', 'Add a new goal')
  .option('-c, --complete <id>', 'Mark goal as complete')
  .option('-l, --list', 'List all goals')
  .action(async (options) => {
    const journal = new Journal();
    try {
      if (options.add) {
        await journal.addGoal(options.add);
        console.log(chalk.green('🎯 Goal added successfully!'));
      } else if (options.complete) {
        await journal.completeGoal(options.complete);
        console.log(chalk.green('🎉 Goal completed!'));
      } else if (options.list) {
        const goals = await journal.listGoals();
        console.log(chalk.blue('📋 Your Goals:'));
        goals.forEach((goal, index) => {
          const status = goal.completed ? '✅' : '⏳';
          console.log(`  ${status} ${index + 1}. ${goal.title}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ Error managing goals:', error.message));
    }
  });

program
  .command('interactive')
  .description('Start interactive journal session')
  .action(async () => {
    displayWelcome();
    const journal = new Journal();
    await journal.interactiveEntry();
  });

// Default action when no command is provided
if (!process.argv.slice(2).length) {
  displayWelcome();
  program.outputHelp();
}

program.parse(process.argv);
