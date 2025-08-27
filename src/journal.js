const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const inquirer = require('inquirer');
const chalk = require('chalk');

class Journal {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.entriesDir = path.join(this.dataDir, 'entries');
    this.goalsFile = path.join(this.dataDir, 'goals.json');
    this.configFile = path.join(this.dataDir, 'config.json');
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    await fs.ensureDir(this.entriesDir);
    
    if (!await fs.pathExists(this.goalsFile)) {
      await fs.writeJson(this.goalsFile, []);
    }
    
    if (!await fs.pathExists(this.configFile)) {
      await fs.writeJson(this.configFile, {
        startDate: moment().format('YYYY-MM-DD'),
        totalEntries: 0,
        streakCount: 0,
        longestStreak: 0
      });
    }
  }

  async createEntry(options = {}) {
    const today = moment().format('YYYY-MM-DD');
    const entryFile = path.join(this.entriesDir, `${today}.json`);
    
    let entry = {
      date: today,
      timestamp: moment().toISOString(),
      entries: []
    };

    // Load existing entries for today if they exist
    if (await fs.pathExists(entryFile)) {
      entry = await fs.readJson(entryFile);
    }

    const newEntry = {
      id: Date.now().toString(),
      timestamp: moment().toISOString(),
      type: options.type || 'general',
      message: options.message || await this.promptForMessage(),
      mood: await this.promptForMood(),
      productivity: await this.promptForProductivity(),
      technologies: await this.promptForTechnologies(),
      timeSpent: await this.promptForTimeSpent()
    };

    entry.entries.push(newEntry);
    await fs.writeJson(entryFile, entry, { spaces: 2 });
    
    // Update statistics
    await this.updateStats();
    
    return newEntry;
  }

  async promptForMessage() {
    const { message } = await inquirer.prompt([{
      type: 'input',
      name: 'message',
      message: 'What did you work on today?',
      validate: input => input.trim().length > 0 || 'Please enter a message'
    }]);
    return message;
  }

  async promptForMood() {
    const { mood } = await inquirer.prompt([{
      type: 'list',
      name: 'mood',
      message: 'How are you feeling about your development today?',
      choices: ['😊 Great', '😐 Okay', '😔 Struggling', '🤔 Confused', '🚀 Excited']
    }]);
    return mood;
  }

  async promptForProductivity() {
    const { productivity } = await inquirer.prompt([{
      type: 'list',
      name: 'productivity',
      message: 'How productive were you today?',
      choices: ['Very High', 'High', 'Medium', 'Low', 'Very Low']
    }]);
    return productivity;
  }

  async promptForTechnologies() {
    const { technologies } = await inquirer.prompt([{
      type: 'input',
      name: 'technologies',
      message: 'What technologies did you use? (comma-separated)',
      filter: input => input.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0)
    }]);
    return technologies;
  }

  async promptForTimeSpent() {
    const { timeSpent } = await inquirer.prompt([{
      type: 'number',
      name: 'timeSpent',
      message: 'How many hours did you spend coding today?',
      default: 2,
      validate: input => input >= 0 || 'Please enter a valid number'
    }]);
    return timeSpent;
  }

  async interactiveEntry() {
    console.log(chalk.blue('\n🚀 Starting interactive journal session...\n'));
    
    const entry = await this.createEntry();
    
    console.log(chalk.green('\n✨ Entry saved successfully!'));
    console.log(chalk.gray(`Entry ID: ${entry.id}`));
    console.log(chalk.gray(`Timestamp: ${entry.timestamp}`));
  }

  async addGoal(goalTitle) {
    const goals = await fs.readJson(this.goalsFile);
    const newGoal = {
      id: Date.now().toString(),
      title: goalTitle,
      createdDate: moment().format('YYYY-MM-DD'),
      completed: false,
      completedDate: null
    };
    
    goals.push(newGoal);
    await fs.writeJson(this.goalsFile, goals, { spaces: 2 });
    
    return newGoal;
  }

  async completeGoal(goalId) {
    const goals = await fs.readJson(this.goalsFile);
    const goal = goals.find(g => g.id === goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    goal.completed = true;
    goal.completedDate = moment().format('YYYY-MM-DD');
    
    await fs.writeJson(this.goalsFile, goals, { spaces: 2 });
    
    return goal;
  }

  async listGoals() {
    return await fs.readJson(this.goalsFile);
  }

  async updateStats() {
    const config = await fs.readJson(this.configFile);
    config.totalEntries = (config.totalEntries || 0) + 1;
    
    // Calculate streak
    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    const yesterdayFile = path.join(this.entriesDir, `${yesterday}.json`);
    
    if (await fs.pathExists(yesterdayFile)) {
      config.streakCount = (config.streakCount || 0) + 1;
    } else {
      config.streakCount = 1;
    }
    
    if (config.streakCount > config.longestStreak) {
      config.longestStreak = config.streakCount;
    }
    
    await fs.writeJson(this.configFile, config, { spaces: 2 });
  }

  async getEntries(days = 30) {
    const entries = [];
    for (let i = 0; i < days; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const entryFile = path.join(this.entriesDir, `${date}.json`);
      
      if (await fs.pathExists(entryFile)) {
        const dayEntry = await fs.readJson(entryFile);
        entries.push(dayEntry);
      }
    }
    
    return entries.reverse();
  }
}

module.exports = Journal;
