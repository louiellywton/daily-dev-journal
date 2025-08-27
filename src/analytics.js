const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

class Analytics {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.entriesDir = path.join(this.dataDir, 'entries');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.analyticsFile = path.join(this.dataDir, 'analytics.json');
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async generateStats(days = 30) {
    const cacheKey = `stats_${days}`;
    const cachedResult = this.getFromCache(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const entries = await this.getEntriesForPeriod(days);
      const config = await this.getConfig();
      
      // Validate data integrity
      const validatedEntries = this.validateEntries(entries);
      
      const stats = {
        period: days,
        generatedAt: moment().toISOString(),
        summary: {
          totalDays: validatedEntries.length,
          totalEntries: validatedEntries.reduce((sum, day) => sum + (day.entries?.length || 0), 0),
          currentStreak: config.streakCount || 0,
          longestStreak: config.longestStreak || 0
        },
        productivity: this.analyzeProductivity(validatedEntries),
        technologies: this.analyzeTechnologies(validatedEntries),
        mood: this.analyzeMood(validatedEntries),
        timeSpent: this.analyzeTimeSpent(validatedEntries),
        patterns: this.analyzePatterns(validatedEntries),
        achievements: await this.calculateAchievements(validatedEntries, config)
      };

      // Cache the result
      this.setCache(cacheKey, stats);

      // Save analytics for future reference
      await this.saveAnalytics(stats);
      
      return stats;
    } catch (error) {
      throw new Error(`Failed to generate statistics: ${error.message}`);
    }
  }

  async getEntriesForPeriod(days) {
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

  async getConfig() {
    try {
      return await fs.readJson(this.configFile);
    } catch {
      return {
        startDate: moment().format('YYYY-MM-DD'),
        totalEntries: 0,
        streakCount: 0,
        longestStreak: 0
      };
    }
  }

  analyzeProductivity(entries) {
    const productivityLevels = {};
    let totalProductivity = 0;
    let count = 0;

    entries.forEach(day => {
      day.entries.forEach(entry => {
        if (entry.productivity) {
          productivityLevels[entry.productivity] = (productivityLevels[entry.productivity] || 0) + 1;
          
          // Convert to numeric for average calculation
          const numericValue = this.productivityToNumeric(entry.productivity);
          totalProductivity += numericValue;
          count++;
        }
      });
    });

    return {
      distribution: productivityLevels,
      average: count > 0 ? (totalProductivity / count).toFixed(2) : 0,
      mostCommon: this.getMostCommon(productivityLevels)
    };
  }

  productivityToNumeric(productivity) {
    const mapping = {
      'Very Low': 1,
      'Low': 2,
      'Medium': 3,
      'High': 4,
      'Very High': 5
    };
    return mapping[productivity] || 0;
  }

  analyzeTechnologies(entries) {
    const techCount = {};
    
    entries.forEach(day => {
      day.entries.forEach(entry => {
        if (entry.technologies && Array.isArray(entry.technologies)) {
          entry.technologies.forEach(tech => {
            techCount[tech] = (techCount[tech] || 0) + 1;
          });
        }
      });
    });

    const sortedTechs = Object.entries(techCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      total: Object.keys(techCount).length,
      mostUsed: sortedTechs,
      distribution: techCount
    };
  }

  analyzeMood(entries) {
    const moodCount = {};
    
    entries.forEach(day => {
      day.entries.forEach(entry => {
        if (entry.mood) {
          moodCount[entry.mood] = (moodCount[entry.mood] || 0) + 1;
        }
      });
    });

    return {
      distribution: moodCount,
      mostCommon: this.getMostCommon(moodCount)
    };
  }

  analyzeTimeSpent(entries) {
    let totalHours = 0;
    let count = 0;
    const dailyHours = [];

    entries.forEach(day => {
      let dayTotal = 0;
      day.entries.forEach(entry => {
        if (typeof entry.timeSpent === 'number') {
          totalHours += entry.timeSpent;
          dayTotal += entry.timeSpent;
          count++;
        }
      });
      if (dayTotal > 0) {
        dailyHours.push(dayTotal);
      }
    });

    return {
      total: totalHours,
      average: count > 0 ? (totalHours / count).toFixed(2) : 0,
      dailyAverage: dailyHours.length > 0 ? 
        (dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length).toFixed(2) : 0,
      maxSingleDay: dailyHours.length > 0 ? Math.max(...dailyHours) : 0
    };
  }

  analyzePatterns(entries) {
    const dayOfWeekCount = {};
    const hourlyActivity = {};
    
    entries.forEach(day => {
      const dayOfWeek = moment(day.date).format('dddd');
      dayOfWeekCount[dayOfWeek] = (dayOfWeekCount[dayOfWeek] || 0) + day.entries.length;
      
      day.entries.forEach(entry => {
        const hour = moment(entry.timestamp).hour();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      });
    });

    return {
      bestDayOfWeek: this.getMostCommon(dayOfWeekCount),
      mostActiveHour: this.getMostCommon(hourlyActivity),
      dayOfWeekDistribution: dayOfWeekCount,
      hourlyDistribution: hourlyActivity
    };
  }

  async calculateAchievements(entries, config) {
    const achievements = [];
    
    // Streak achievements
    if (config.streakCount >= 7) {
      achievements.push({
        title: 'Week Warrior',
        description: '7+ day coding streak',
        earned: true
      });
    }
    
    if (config.streakCount >= 30) {
      achievements.push({
        title: 'Month Master',
        description: '30+ day coding streak',
        earned: true
      });
    }

    // Entry count achievements
    if (config.totalEntries >= 50) {
      achievements.push({
        title: 'Prolific Writer',
        description: '50+ journal entries',
        earned: true
      });
    }

    // Technology diversity
    const allTechs = new Set();
    entries.forEach(day => {
      day.entries.forEach(entry => {
        if (entry.technologies) {
          entry.technologies.forEach(tech => allTechs.add(tech));
        }
      });
    });

    if (allTechs.size >= 10) {
      achievements.push({
        title: 'Tech Explorer',
        description: 'Used 10+ different technologies',
        earned: true
      });
    }

    return achievements;
  }

  getMostCommon(object) {
    if (Object.keys(object).length === 0) return null;
    
    return Object.entries(object).reduce((a, b) => 
      object[a[0]] > object[b[0]] ? a : b
    )[0];
  }

  async saveAnalytics(stats) {
    const analytics = {
      lastGenerated: moment().toISOString(),
      stats: stats
    };
    
    await fs.writeJson(this.analyticsFile, analytics, { spaces: 2 });
  }

  async getHistoricalAnalytics() {
    try {
      return await fs.readJson(this.analyticsFile);
    } catch {
      return null;
    }
  }

  // Cache management methods
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Data validation methods
  validateEntries(entries) {
    return entries.filter(day => {
      return day && 
             day.date && 
             day.entries && 
             Array.isArray(day.entries) &&
             moment(day.date, 'YYYY-MM-DD', true).isValid();
    }).map(day => ({
      ...day,
      entries: day.entries.filter(entry => 
        entry && 
        entry.timestamp && 
        moment(entry.timestamp).isValid()
      )
    }));
  }

  // Performance optimization: Batch file operations
  async batchReadEntries(dates) {
    const promises = dates.map(date => {
      const entryFile = path.join(this.entriesDir, `${date}.json`);
      return fs.pathExists(entryFile).then(exists => 
        exists ? fs.readJson(entryFile) : null
      );
    });
    
    const results = await Promise.all(promises);
    return results.filter(entry => entry !== null);
  }
}

module.exports = Analytics;
