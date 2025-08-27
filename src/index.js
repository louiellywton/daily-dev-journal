#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const Journal = require('./journal');
const Analytics = require('./analytics');
const DataExporter = require('./export');
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
      console.log(chalk.green('Journal entry created successfully!'));
    } catch (error) {
      console.error(chalk.red('Error creating entry:', error.message));
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
      console.error(chalk.red('Error generating stats:', error.message));
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
        console.log(chalk.green('Goal added successfully!'));
      } else if (options.complete) {
        await journal.completeGoal(options.complete);
        console.log(chalk.green('Goal completed!'));
      } else if (options.list) {
        const goals = await journal.listGoals();
        console.log(chalk.blue('Your Goals:'));
        goals.forEach((goal, index) => {
          const status = goal.completed ? '[DONE]' : '[TODO]';
          console.log(`  ${status} ${index + 1}. ${goal.title}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('Error managing goals:', error.message));
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

program
  .command('export')
  .description('Export journal data to different formats')
  .option('-f, --format <format>', 'Export format (json, csv, md)', 'json')
  .option('-d, --days <days>', 'Number of days to export', '365')
  .option('--no-analytics', 'Exclude analytics from export')
  .action(async (options) => {
    const exporter = new DataExporter();
    try {
      console.log(chalk.blue(`Exporting ${options.days} days of data in ${options.format} format...`));
      const result = await exporter.exportData(options.format, {
        days: parseInt(options.days),
        analytics: options.analytics
      });
      console.log(chalk.green('Export completed successfully!'));
      console.log(chalk.gray(`File: ${result.filename}`));
      console.log(chalk.gray(`Path: ${result.path}`));
    } catch (error) {
      console.error(chalk.red('Export failed:', error.message));
    }
  });

// Default action when no command is provided
if (!process.argv.slice(2).length) {
  displayWelcome();
  program.outputHelp();
}

program.parse(process.argv);
