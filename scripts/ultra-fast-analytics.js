#!/usr/bin/env node

/**
 * Ultra-Fast Analytics Processing
 * 
 * Minimal, lightning-fast version for CI/CD environments
 * Focuses only on essential operations with aggressive optimizations
 */

const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const LogOptimizer = require('../src/log-optimizer');

class LightweightAnalytics {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.entriesDir = path.join(this.dataDir, 'entries');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.analyticsFile = path.join(this.dataDir, 'analytics.json');
    this.goalsFile = path.join(this.dataDir, 'goals.json');
    this.logsDir = path.join(this.dataDir, 'logs');
    this.reportsDir = path.join(this.dataDir, 'reports');
    this.startTime = Date.now();
    this.maxRuntime = 5 * 60 * 1000; // 5 minutes max
    
    // Initialize logging system
    this.logOptimizer = new LogOptimizer();
    
    // Simplified metrics
    this.metrics = {
      entriesProcessed: 0,
      errorsEncountered: 0,
      processingTime: 0
    };
  }

  async run() {
    console.log('⚡ Starting ultra-fast analytics processing...');
    
    // Set aggressive timeout
    const timeout = setTimeout(() => {
      console.log('⚠️ Ultra-fast processing timeout, exiting...');
      process.exit(1);
    }, this.maxRuntime);

    try {
      // 1. Ensure directories exist (essential for logging)
      await this.ensureDirectories();
      
      // 2. Run core operations in parallel for speed
      const [basicStats, insights, logging] = await Promise.allSettled([
        this.generateBasicStats(),
        this.generateDailyInsights(),
        this.performLogging()
      ]);

      if (basicStats.status === 'fulfilled') {
        console.log('✅ Basic statistics generated');
      } else {
        console.warn('⚠️ Basic stats failed:', basicStats.reason.message);
        await this.logError(new Error(`Basic stats failed: ${basicStats.reason.message}`));
      }

      if (insights.status === 'fulfilled') {
        console.log('✅ Daily insights generated');
      } else {
        console.warn('⚠️ Insights failed:', insights.reason.message);
        await this.logError(new Error(`Insights failed: ${insights.reason.message}`));
      }
      
      if (logging.status === 'fulfilled') {
        console.log('✅ Logging completed');
      } else {
        console.warn('⚠️ Logging failed:', logging.reason.message);
      }
      
      // 3. Goals alignment check (fast)
      await this.checkGoalsAlignment();
      
      // 4. Generate weekly report if needed
      await this.generateWeeklyReportIfNeeded();

      // 5. Quick health check
      const healthOk = await this.quickHealthCheck();
      console.log(`📊 System health: ${healthOk ? 'OK' : 'Warning'}`);
      
      // 6. Log successful completion
      await this.logDailyRun();

      const duration = Date.now() - this.startTime;
      console.log(`⚡ Ultra-fast processing completed in ${duration}ms`);
      
      clearTimeout(timeout);
      
    } catch (error) {
      console.error('❌ Ultra-fast processing failed:', error.message);
      await this.logError(error);
      clearTimeout(timeout);
      process.exit(1);
    }
  }

  async generateBasicStats() {
    const entries = await this.getRecentEntries(30); // Only last 30 days
    const validEntries = entries.filter(entry => entry && entry.entries);

    const stats = {
      period: 30,
      generatedAt: moment().toISOString(),
      summary: {
        totalDays: validEntries.length,
        totalEntries: validEntries.reduce((sum, day) => sum + (day.entries?.length || 0), 0)
      },
      productivity: this.analyzeProductivityFast(validEntries),
      technologies: this.analyzeTechnologiesFast(validEntries),
      timeSpent: this.analyzeTimeSpentFast(validEntries)
    };

    // Save analytics quickly
    await fs.writeJson(this.analyticsFile, {
      lastGenerated: moment().toISOString(),
      stats: stats
    }, { spaces: 2 });

    this.metrics.entriesProcessed = validEntries.length;
    return stats;
  }

  async generateDailyInsights() {
    const today = moment().format('YYYY-MM-DD');
    const insightFile = path.join(this.dataDir, 'daily-insights', `${today}.json`);
    
    await fs.ensureDir(path.dirname(insightFile));
    
    // Generate synthetic entry if none exists (important for GitHub contributions)
    await this.ensureDailyEntry(today);
    
    // Update streak data (essential for progress tracking)
    await this.updateStreakData();
    
    const insights = {
      date: today,
      generated: moment().toISOString(),
      insights: [
        {
          type: 'system',
          message: 'Daily analytics processing completed successfully',
          timestamp: moment().toISOString()
        },
        {
          type: 'contribution',
          message: 'Daily GitHub contribution generated',
          timestamp: moment().toISOString()
        }
      ],
      tips: this.getQuickTip(),
      motivation: this.getQuickMotivation()
    };

    await fs.writeJson(insightFile, insights, { spaces: 2 });
    return insights;
  }

  async getRecentEntries(days) {
    const entries = [];
    const promises = [];
    
    // Process in smaller batches for speed
    for (let i = 0; i < days; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      promises.push(this.getEntry(date));
      
      // Process in batches of 10
      if (promises.length >= 10 || i === days - 1) {
        const results = await Promise.allSettled(promises);
        entries.push(...results
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => r.value)
        );
        promises.length = 0; // Clear array
      }
    }
    
    return entries.reverse();
  }

  async getEntry(date) {
    const entryPath = path.join(this.entriesDir, `${date}.json`);
    
    try {
      if (await fs.pathExists(entryPath)) {
        return await fs.readJson(entryPath);
      }
    } catch (error) {
      this.metrics.errorsEncountered++;
      return null;
    }
    
    return null;
  }

  analyzeProductivityFast(entries) {
    let totalProductivity = 0;
    let count = 0;
    const levels = {};

    for (const day of entries) {
      for (const entry of day.entries || []) {
        if (entry.productivity) {
          levels[entry.productivity] = (levels[entry.productivity] || 0) + 1;
          totalProductivity += this.productivityToNumeric(entry.productivity);
          count++;
        }
      }
    }

    return {
      distribution: levels,
      average: count > 0 ? (totalProductivity / count).toFixed(2) : 0,
      mostCommon: this.getMostCommon(levels)
    };
  }

  analyzeTechnologiesFast(entries) {
    const techCount = {};
    
    for (const day of entries) {
      for (const entry of day.entries || []) {
        if (entry.technologies && Array.isArray(entry.technologies)) {
          for (const tech of entry.technologies) {
            techCount[tech] = (techCount[tech] || 0) + 1;
          }
        }
      }
    }

    const sortedTechs = Object.entries(techCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5); // Only top 5

    return {
      total: Object.keys(techCount).length,
      mostUsed: sortedTechs
    };
  }

  analyzeTimeSpentFast(entries) {
    let totalHours = 0;
    let count = 0;

    for (const day of entries) {
      for (const entry of day.entries || []) {
        if (typeof entry.timeSpent === 'number') {
          totalHours += entry.timeSpent;
          count++;
        }
      }
    }

    return {
      total: totalHours,
      average: count > 0 ? (totalHours / count).toFixed(2) : 0
    };
  }

  productivityToNumeric(productivity) {
    const mapping = {
      'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5
    };
    return mapping[productivity] || 0;
  }

  getMostCommon(object) {
    if (Object.keys(object).length === 0) return null;
    return Object.entries(object).reduce((a, b) => object[a[0]] > object[b[0]] ? a : b)[0];
  }

  getQuickTip() {
    const tips = [
      'Take regular breaks for better productivity',
      'Document your code for future reference',
      'Set small daily goals to maintain momentum',
      'Review and refactor previous work',
      'Keep learning new technologies'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  getQuickMotivation() {
    const quotes = [
      'Code is like humor. When you have to explain it, it\'s bad.',
      'Make it work, make it right, make it fast.',
      'Any fool can write code that a computer can understand.',
      'First, solve the problem. Then, write the code.',
      'Experience is the name everyone gives to their mistakes.'
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // Essential for GitHub contributions - ensure daily entry exists
  async ensureDailyEntry(date) {
    const entryFile = path.join(this.entriesDir, `${date}.json`);
    
    if (!await fs.pathExists(entryFile)) {
      await fs.ensureDir(this.entriesDir);
      
      const technologies = ['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript'];
      const activities = [
        'Updated project documentation and code comments',
        'Improved code structure and organization', 
        'Fixed bugs and enhanced error handling',
        'Optimized performance and code efficiency',
        'Worked on feature development and testing'
      ];
      
      const entry = {
        date: date,
        timestamp: moment(date).add(Math.floor(Math.random() * 8) + 10, 'hours').toISOString(),
        entries: [{
          id: Date.now().toString(),
          timestamp: moment(date).add(Math.floor(Math.random() * 8) + 10, 'hours').toISOString(),
          type: 'development',
          message: activities[Math.floor(Math.random() * activities.length)],
          mood: 'Productive',
          productivity: 'High',
          technologies: [technologies[Math.floor(Math.random() * technologies.length)]],
          timeSpent: Math.floor(Math.random() * 4) + 2 // 2-5 hours
        }]
      };
      
      await fs.writeJson(entryFile, entry, { spaces: 2 });
      
      // Update config total entries count
      const config = await this.getConfig();
      config.totalEntries = (config.totalEntries || 0) + 1;
      await fs.writeJson(this.configFile, config, { spaces: 2 });
      
      console.log(`✅ Generated daily entry for ${date}`);
    }
  }

  // Essential for progress tracking - update streak data
  async updateStreakData() {
    const config = await this.getConfig();
    const today = moment().format('YYYY-MM-DD');
    
    // Update last activity date for streak tracking
    config.lastActivity = today;
    
    // Simple streak calculation
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    if (config.lastActivity === yesterday || !config.currentStreak) {
      config.currentStreak = (config.currentStreak || 0) + 1;
    } else {
      config.currentStreak = 1; // Reset streak
    }
    
    // Update longest streak
    config.longestStreak = Math.max(config.longestStreak || 0, config.currentStreak);
    
    await fs.writeJson(this.configFile, config, { spaces: 2 });
    console.log(`📈 Updated streak: ${config.currentStreak} days`);
  }

  async getConfig() {
    try {
      return await fs.readJson(this.configFile);
    } catch {
      return {
        startDate: moment().format('YYYY-MM-DD'),
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: moment().format('YYYY-MM-DD')
      };
    }
  }

  async quickHealthCheck() {
    try {
      // Quick file system check
      const configExists = await fs.pathExists(this.configFile);
      const entriesDirExists = await fs.pathExists(this.entriesDir);
      
      // Memory check
      const memUsage = process.memoryUsage();
      const memoryOk = memUsage.heapUsed < 200 * 1024 * 1024; // 200MB threshold
      
      return configExists && entriesDirExists && memoryOk;
    } catch (error) {
      return false;
    }
  }

  // Essential logging functions (NEVER DELETED)
  async ensureDirectories() {
    await fs.ensureDir(this.logsDir);
    await fs.ensureDir(this.reportsDir);
    await fs.ensureDir(path.join(this.dataDir, 'daily-insights'));
  }

  async performLogging() {
    // Lightweight log optimization (keeps logs forever)
    const today = moment().format('YYYY-MM-DD');
    const logFile = path.join(this.logsDir, `${today}.log`);
    
    const logEntry = {
      timestamp: moment().toISOString(),
      type: 'ultra_fast_analytics',
      status: 'running',
      message: 'Ultra-fast analytics processing started',
      metrics: this.metrics
    };
    
    const logContent = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logFile, logContent);
    
    console.log('📝 Daily logging initiated');
  }

  async logDailyRun() {
    const today = moment().format('YYYY-MM-DD');
    const logFile = path.join(this.logsDir, `${today}.log`);
    
    const logEntry = {
      timestamp: moment().toISOString(),
      type: 'ultra_fast_analytics',
      status: 'success',
      message: 'Ultra-fast analytics completed successfully',
      duration: Date.now() - this.startTime,
      metrics: this.metrics
    };
    
    const logContent = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logFile, logContent);
  }

  async logError(error) {
    const today = moment().format('YYYY-MM-DD');
    const logFile = path.join(this.logsDir, `${today}.log`);
    
    const logEntry = {
      timestamp: moment().toISOString(),
      type: 'error',
      status: 'failed',
      message: error.message,
      stack: error.stack,
      metrics: this.metrics
    };
    
    const logContent = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logFile, logContent);
  }

  // Goals alignment (matches your goals system)
  async checkGoalsAlignment() {
    try {
      const goals = await this.getGoals();
      const recentEntries = await this.getRecentEntries(7);
      
      // Check if recent entries align with goal technologies
      const goalTechs = this.extractGoalTechnologies(goals);
      const recentTechs = this.extractRecentTechnologies(recentEntries);
      
      const alignment = this.calculateGoalAlignment(goalTechs, recentTechs);
      
      if (alignment.score > 0.3) {
        console.log(`🎯 Goals alignment: ${(alignment.score * 100).toFixed(1)}% (Good!)`);
      } else {
        console.log(`🎯 Goals alignment: ${(alignment.score * 100).toFixed(1)}% (Consider working on goal technologies)`);
      }
      
    } catch (error) {
      console.log('🎯 Goals alignment: Not available (no goals set)');
    }
  }

  async getGoals() {
    try {
      return await fs.readJson(this.goalsFile);
    } catch {
      return { goals: [] };
    }
  }

  extractGoalTechnologies(goalsData) {
    const techs = new Set();
    const techKeywords = {
      'node': ['Node.js', 'JavaScript'],
      'git': ['Git'],
      'ruby': ['Ruby'],
      'rails': ['Ruby', 'Ruby on Rails'],
      'aws': ['AWS', 'Cloud'],
      'python': ['Python'],
      'cloud': ['AWS', 'Azure', 'GCP']
    };
    
    for (const goal of goalsData.goals || []) {
      const title = goal.title.toLowerCase();
      for (const [keyword, technologies] of Object.entries(techKeywords)) {
        if (title.includes(keyword)) {
          technologies.forEach(tech => techs.add(tech));
        }
      }
    }
    
    return Array.from(techs);
  }

  extractRecentTechnologies(entries) {
    const techs = new Set();
    for (const day of entries) {
      for (const entry of day.entries || []) {
        if (entry.technologies) {
          entry.technologies.forEach(tech => techs.add(tech));
        }
      }
    }
    return Array.from(techs);
  }

  calculateGoalAlignment(goalTechs, recentTechs) {
    if (goalTechs.length === 0) return { score: 0, matches: [] };
    
    const matches = goalTechs.filter(tech => 
      recentTechs.some(recent => 
        recent.toLowerCase().includes(tech.toLowerCase()) ||
        tech.toLowerCase().includes(recent.toLowerCase())
      )
    );
    
    return {
      score: matches.length / goalTechs.length,
      matches: matches
    };
  }

  // Fast weekly report generation (Sundays only)
  async generateWeeklyReportIfNeeded() {
    const today = moment();
    
    if (today.day() === 0) { // Sunday
      const weekStart = today.clone().startOf('week').format('YYYY-MM-DD');
      const reportFile = path.join(this.reportsDir, `week-${weekStart}.json`);
      
      if (!await fs.pathExists(reportFile)) {
        const entries = await this.getRecentEntries(7);
        const stats = {
          productivity: this.analyzeProductivityFast(entries),
          technologies: this.analyzeTechnologiesFast(entries),
          timeSpent: this.analyzeTimeSpentFast(entries)
        };
        
        const weeklyReport = {
          period: { start: weekStart, end: today.format('YYYY-MM-DD') },
          generated: moment().toISOString(),
          stats: stats,
          summary: {
            totalHours: stats.timeSpent.total,
            averageProductivity: stats.productivity.average,
            technologiesUsed: stats.technologies.total
          }
        };
        
        await fs.writeJson(reportFile, weeklyReport, { spaces: 2 });
        console.log('📊 Generated weekly report');
      }
    }
  }
}

class UltraFastRunner {
  constructor() {
    this.analytics = new LightweightAnalytics();
  }

  async run() {
    try {
      await this.analytics.run();
      process.exit(0);
    } catch (error) {
      console.error('Ultra-fast runner failed:', error);
      process.exit(1);
    }
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  console.log('🛑 Ultra-fast process terminated');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Ultra-fast process interrupted');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  const runner = new UltraFastRunner();
  runner.run();
}

module.exports = UltraFastRunner;
