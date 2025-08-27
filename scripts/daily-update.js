#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const Journal = require('../src/journal');
const Analytics = require('../src/analytics');

class DailyUpdater {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.logsDir = path.join(this.dataDir, 'logs');
    this.reportsDir = path.join(this.dataDir, 'reports');
    this.journal = new Journal();
    this.analytics = new Analytics();
  }

  async run() {
    console.log('🚀 Running daily update...');
    
    try {
      await this.ensureDirectories();
      await this.generateDailyInsight();
      await this.updateStreakData();
      await this.generateWeeklyReport();
      await this.cleanupOldData();
      await this.logDailyRun();
      
      console.log('✅ Daily update completed successfully!');
    } catch (error) {
      console.error('❌ Daily update failed:', error);
      await this.logError(error);
      process.exit(1);
    }
  }

  async ensureDirectories() {
    await fs.ensureDir(this.logsDir);
    await fs.ensureDir(this.reportsDir);
  }

  async generateDailyInsight() {
    const today = moment().format('YYYY-MM-DD');
    const insightFile = path.join(this.dataDir, 'daily-insights', `${today}.json`);
    
    await fs.ensureDir(path.dirname(insightFile));
    
    // Generate some motivational insights
    const insights = await this.createDailyInsights();
    
    await fs.writeJson(insightFile, {
      date: today,
      generated: moment().toISOString(),
      insights: insights,
      tips: this.getDailyTips(),
      motivation: this.getMotivationalQuote()
    }, { spaces: 2 });
    
    console.log('📊 Generated daily insights');
  }

  async createDailyInsights() {
    const recentEntries = await this.journal.getEntries(7);
    const stats = await this.analytics.generateStats(7);
    
    const insights = [];
    
    // Productivity trend
    if (stats.productivity.average > 3.5) {
      insights.push({
        type: 'productivity',
        message: '🎯 You\'ve been highly productive this week! Keep up the great work.',
        data: { average: stats.productivity.average }
      });
    } else if (stats.productivity.average < 2.5) {
      insights.push({
        type: 'productivity',
        message: '💡 Consider breaking down tasks into smaller chunks to boost productivity.',
        data: { average: stats.productivity.average }
      });
    }
    
    // Technology usage
    if (stats.technologies.total > 5) {
      insights.push({
        type: 'learning',
        message: `🛠️ You've worked with ${stats.technologies.total} different technologies this week!`,
        data: { technologies: stats.technologies.mostUsed.slice(0, 3) }
      });
    }
    
    // Streak motivation
    if (stats.summary.currentStreak > 0) {
      insights.push({
        type: 'streak',
        message: `🔥 ${stats.summary.currentStreak} day streak! Every day counts toward your growth.`,
        data: { streak: stats.summary.currentStreak }
      });
    }
    
    return insights;
  }

  getDailyTips() {
    const tips = [
      'Take regular breaks using the Pomodoro Technique (25 min work, 5 min break)',
      'Document your learning with comments and README updates',
      'Practice explaining code concepts to improve understanding',
      'Set small, achievable daily goals to maintain momentum',
      'Review and refactor code from previous days',
      'Explore one new feature or technique in your favorite language',
      'Connect with the developer community through forums or social media',
      'Keep a running list of interesting problems you want to solve',
      'Backup and version control your projects regularly',
      'Celebrate small wins and progress milestones'
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  getMotivationalQuote() {
    const quotes = [
      'The only way to do great work is to love what you do. - Steve Jobs',
      'Code is like humor. When you have to explain it, it\'s bad. - Cory House',
      'Programming isn\'t about what you know; it\'s about what you can figure out. - Chris Pine',
      'The best error message is the one that never shows up. - Thomas Fuchs',
      'Experience is the name everyone gives to their mistakes. - Oscar Wilde',
      'Simplicity is the ultimate sophistication. - Leonardo da Vinci',
      'Make it work, make it right, make it fast. - Kent Beck',
      'Any fool can write code that a computer can understand. Good programmers write code that humans can understand. - Martin Fowler',
      'First, solve the problem. Then, write the code. - John Johnson',
      'Learning never exhausts the mind. - Leonardo da Vinci'
    ];
    
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  async updateStreakData() {
    const configFile = path.join(this.dataDir, 'config.json');
    const config = await fs.readJson(configFile);
    
    // Update last activity date
    config.lastActivity = moment().format('YYYY-MM-DD');
    
    await fs.writeJson(configFile, config, { spaces: 2 });
    
    console.log('📅 Updated streak data');
  }

  async generateWeeklyReport() {
    const today = moment();
    
    // Generate weekly report on Sundays
    if (today.day() === 0) {
      const weekStart = today.clone().startOf('week').format('YYYY-MM-DD');
      const weekEnd = today.clone().endOf('week').format('YYYY-MM-DD');
      const reportFile = path.join(this.reportsDir, `week-${weekStart}.json`);
      
      const weeklyStats = await this.analytics.generateStats(7);
      const weeklyReport = {
        period: { start: weekStart, end: weekEnd },
        generated: moment().toISOString(),
        stats: weeklyStats,
        summary: this.generateWeeklySummary(weeklyStats),
        recommendations: this.generateRecommendations(weeklyStats)
      };
      
      await fs.writeJson(reportFile, weeklyReport, { spaces: 2 });
      console.log('📝 Generated weekly report');
    }
  }

  generateWeeklySummary(stats) {
    return {
      totalHours: stats.timeSpent.total,
      averageProductivity: stats.productivity.average,
      technologiesUsed: stats.technologies.total,
      moodTrend: stats.mood.mostCommon,
      achievements: stats.achievements.length
    };
  }

  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.timeSpent.average < 1) {
      recommendations.push('Consider dedicating more time to daily coding practice');
    }
    
    if (stats.technologies.total < 2) {
      recommendations.push('Try exploring a new technology or tool this week');
    }
    
    if (stats.productivity.average < 3) {
      recommendations.push('Focus on smaller, more achievable daily goals');
    }
    
    return recommendations;
  }

  async cleanupOldData() {
    // Clean up logs older than 30 days
    const cutoffDate = moment().subtract(30, 'days');
    const logFiles = await fs.readdir(this.logsDir).catch(() => []);
    
    for (const logFile of logFiles) {
      const filePath = path.join(this.logsDir, logFile);
      const fileDate = moment(logFile.replace('.log', ''), 'YYYY-MM-DD');
      
      if (fileDate.isBefore(cutoffDate)) {
        await fs.remove(filePath);
        console.log(`🗑️ Cleaned up old log: ${logFile}`);
      }
    }
  }

  async logDailyRun() {
    const today = moment().format('YYYY-MM-DD');
    const logFile = path.join(this.logsDir, `${today}.log`);
    
    const logEntry = {
      timestamp: moment().toISOString(),
      type: 'daily_update',
      status: 'success',
      message: 'Daily update completed successfully'
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
      stack: error.stack
    };
    
    const logContent = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logFile, logContent);
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new DailyUpdater();
  updater.run();
}

module.exports = DailyUpdater;
