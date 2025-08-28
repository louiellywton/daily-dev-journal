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
    try {
      await fs.ensureDir(this.entriesDir);
      
      // Initialize goals file with default structure if it doesn't exist
      if (!await fs.pathExists(this.goalsFile)) {
        await fs.writeJson(this.goalsFile, {
          goals: [],
          metadata: {
            created: moment().toISOString(),
            version: '1.0.0'
          }
        });
      }
      
      // Initialize config with enhanced default settings
      if (!await fs.pathExists(this.configFile)) {
        await fs.writeJson(this.configFile, {
          startDate: moment().format('YYYY-MM-DD'),
          totalEntries: 0,
          streakCount: 0,
          longestStreak: 0,
          preferences: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            theme: 'default'
          },
          version: '1.0.0'
        });
      }
    } catch (error) {
      throw new Error(`Failed to initialize journal directories: ${error.message}`);
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
      choices: ['Great', 'Okay', 'Struggling', 'Confused', 'Excited']
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
    console.log(chalk.blue('\nStarting interactive journal session...\n'));
    
    const entry = await this.createEntry();
    
    console.log(chalk.green('\nEntry saved successfully!'));
    console.log(chalk.gray(`Entry ID: ${entry.id}`));
    console.log(chalk.gray(`Timestamp: ${entry.timestamp}`));
  }

  async addGoal(goalTitle) {
    let goalsData = await fs.readJson(this.goalsFile);
    
    // Handle both old and new goal file structures
    if (Array.isArray(goalsData)) {
      // Old format - migrate to new format
      goalsData = {
        goals: goalsData,
        metadata: {
          created: moment().toISOString(),
          version: '1.0.0'
        }
      };
    }
    
    const newGoal = {
      id: Date.now().toString(),
      title: goalTitle,
      createdDate: moment().format('YYYY-MM-DD'),
      completed: false,
      completedDate: null
    };
    
    goalsData.goals.push(newGoal);
    await fs.writeJson(this.goalsFile, goalsData, { spaces: 2 });
    
    return newGoal;
  }

  async completeGoal(goalId) {
    let goalsData = await fs.readJson(this.goalsFile);
    
    // Handle both old and new goal file structures
    if (Array.isArray(goalsData)) {
      goalsData = { goals: goalsData };
    }
    
    const goal = goalsData.goals.find(g => g.id === goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    goal.completed = true;
    goal.completedDate = moment().format('YYYY-MM-DD');
    
    await fs.writeJson(this.goalsFile, goalsData, { spaces: 2 });
    
    return goal;
  }

  async listGoals() {
    let goalsData = await fs.readJson(this.goalsFile);
    
    // Handle both old and new goal file structures
    if (Array.isArray(goalsData)) {
      return goalsData;
    }
    
    return goalsData.goals || [];
  }

  async updateStats() {
    const config = await fs.readJson(this.configFile);
    config.totalEntries = (config.totalEntries || 0) + 1;
    
    // Calculate streak with improved logic
    const today = moment().format('YYYY-MM-DD');
    const todayFile = path.join(this.entriesDir, `${today}.json`);
    
    // Only update streak if this is the first entry today
    const todayExists = await fs.pathExists(todayFile);
    let wasAlreadyLoggedToday = false;
    
    if (todayExists) {
      const todayEntry = await fs.readJson(todayFile);
      wasAlreadyLoggedToday = todayEntry.entries && todayEntry.entries.length > 1;
    }
    
    if (!wasAlreadyLoggedToday) {
      // Calculate current streak by checking backward from today
      config.streakCount = await this.calculateCurrentStreak();
      
      if (config.streakCount > (config.longestStreak || 0)) {
        config.longestStreak = config.streakCount;
      }
      
      // Set start date if this is the first entry ever
      if (!config.startDate) {
        config.startDate = today;
      }
    }
    
    // Update last activity
    config.lastActivity = today;
    
    await fs.writeJson(this.configFile, config, { spaces: 2 });
  }
  
  async calculateCurrentStreak() {
    let streak = 0;
    let currentDate = moment();
    
    // Check backward from today to find consecutive days
    while (true) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const entryFile = path.join(this.entriesDir, `${dateStr}.json`);
      
      if (await fs.pathExists(entryFile)) {
        streak++;
        currentDate = currentDate.subtract(1, 'day');
      } else {
        break;
      }
      
      // Safety limit to prevent infinite loops
      if (streak > 10000) break;
    }
    
    return streak;
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
