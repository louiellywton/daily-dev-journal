const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const VectorAnalytics = require('./vector-analytics');
const { PerformanceEngine } = require('./performance-engine');
const { EventSystem } = require('./event-system');
const { AnalyticsPipeline } = require('./data-pipeline');

class Analytics {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.entriesDir = path.join(this.dataDir, 'entries');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.analyticsFile = path.join(this.dataDir, 'analytics.json');
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Initialize high-performance systems
    this.performanceEngine = new PerformanceEngine();
    this.eventSystem = new EventSystem({
      persistence: true,
      monitoring: true
    });
    this.analyticsPipeline = new AnalyticsPipeline({
      enableRealtime: true,
      slidingWindow: true,
      windowSize: 86400000 // 24 hours
    });
    
    this.initialized = false;
    this.setupEventHandlers();
  }

  async initialize() {
    if (!this.initialized) {
      console.log('🚀 Initializing high-performance analytics systems...');
      await this.performanceEngine.initialize();
      this.initialized = true;
      console.log('✅ Analytics systems initialized');
    }
  }

  setupEventHandlers() {
    // Setup analytics processing events
    this.eventSystem.eventBus.on('analytics.generate', async (data) => {
      await this.generateStats(data.days || 30);
    });
    
    this.eventSystem.eventBus.on('data.processed', (data) => {
      this.analyticsPipeline.processData(data);
    });
  }

  async generateStats(days = 30) {
    await this.initialize();
    
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
      
      // Emit analytics completion event
      this.eventSystem.eventBus.emit('analytics.completed', {
        stats: stats,
        performance: this.getPerformanceMetrics()
      });
      
      return stats;
    } catch (error) {
      throw new Error(`Failed to generate statistics: ${error.message}`);
    }
  }

  async getEntriesForPeriod(days) {
    await this.initialize();
    
    // Use high-performance engine for optimized data retrieval
    if (days > 100) {
      return this.getHighPerformanceBatchEntries(days);
    }
    
    const entries = [];
    for (let i = 0; i < days; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      
      // Use performance engine's optimized getEntry method
      const dayEntry = await this.performanceEngine.getEntry(date);
      if (dayEntry) {
        entries.push(dayEntry);
      }
    }
    
    return entries.reverse();
  }
  
  async getHighPerformanceBatchEntries(days) {
    const startDate = moment().subtract(days - 1, 'days').format('YYYY-MM-DD');
    const endDate = moment().format('YYYY-MM-DD');
    
    // Use performance engine's optimized range query
    return await this.performanceEngine.getEntriesInRange(startDate, endDate, days);
  }
  
  async getBatchEntriesForPeriod(days) {
    // Fallback to traditional batch processing if needed
    const dates = [];
    for (let i = 0; i < days; i++) {
      dates.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }
    
    // Use analytics pipeline for batch processing
    const transformations = [{
      fn: async (batch) => {
        const batchEntries = [];
        for (const date of batch) {
          const entry = await this.performanceEngine.getEntry(date);
          if (entry) batchEntries.push(entry);
        }
        return batchEntries;
      },
      batchSize: 50,
      concurrency: 4
    }];
    
    const result = await this.analyticsPipeline.processData(dates, transformations);
    return result.flat().reverse();
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

  // Vector-based advanced analytics
  async generateAdvancedAnalytics(days = 30) {
    const cacheKey = `vector_analytics_${days}`;
    const cachedResult = this.getFromCache(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const entries = await this.getEntriesForPeriod(days);
      const validatedEntries = this.validateEntries(entries);
      
      if (validatedEntries.length < 3) {
        return {
          status: 'insufficient_data',
          message: 'Need at least 3 days of data for advanced vector analytics',
          dataPoints: validatedEntries.length
        };
      }

      const vectorAnalytics = new VectorAnalytics();
      const advancedReport = await vectorAnalytics.generateVectorReport(validatedEntries);
      
      // Cache the result for better performance
      this.setCache(cacheKey, advancedReport);
      
      return advancedReport;
    } catch (error) {
      throw new Error(`Failed to generate advanced analytics: ${error.message}`);
    }
  }

  // Hybrid analytics combining traditional stats with vector analysis
  async generateHybridAnalytics(days = 30) {
    const [traditionalStats, vectorStats] = await Promise.all([
      this.generateStats(days),
      this.generateAdvancedAnalytics(days)
    ]);

    return {
      generatedAt: moment().toISOString(),
      period: days,
      traditional: traditionalStats,
      advanced: vectorStats,
      performance: {
        optimizationLevel: 'hybrid',
        usesVectorComputation: true,
        cacheEnabled: true,
        engine: this.getPerformanceMetrics()
      }
    };
  }

  // Get comprehensive performance metrics
  getPerformanceMetrics() {
    return {
      engine: this.performanceEngine.getPerformanceStats(),
      pipeline: this.analyticsPipeline.getMetrics(),
      eventSystem: this.eventSystem.getSystemStats(),
      traditional: {
        cacheSize: this.cache.size,
        cacheTimeout: this.cacheTimeout,
        memoryUsage: process.memoryUsage()
      }
    };
  }

  // High-performance search capabilities
  async searchTechnologies(query, limit = 10) {
    await this.initialize();
    return this.performanceEngine.searchTechnologies(query, limit);
  }

  async searchKeywords(query, limit = 10) {
    await this.initialize();
    return this.performanceEngine.searchKeywords(query, limit);
  }

  // Real-time analytics streaming
  enableRealtimeAnalytics(callback) {
    this.analyticsPipeline.addRealtimeCallback(callback);
  }

  disableRealtimeAnalytics(callback) {
    this.analyticsPipeline.removeRealtimeCallback(callback);
  }

  // Time-series analytics for trend analysis
  async generateTimeSeriesAnalytics(days = 30, interval = 'day') {
    await this.initialize();
    
    const entries = await this.getEntriesForPeriod(days);
    const validatedEntries = this.validateEntries(entries);
    
    // Flatten entries with timestamps
    const flatEntries = [];
    validatedEntries.forEach(day => {
      day.entries.forEach(entry => {
        flatEntries.push({
          timestamp: entry.timestamp,
          date: day.date,
          productivity: this.productivityToNumeric(entry.productivity),
          timeSpent: entry.timeSpent || 0,
          techCount: entry.technologies ? entry.technologies.length : 0,
          mood: entry.mood
        });
      });
    });
    
    // Use analytics pipeline for time-series analysis
    const productivitySeries = await this.analyticsPipeline.analyzeTimeSeries(
      flatEntries,
      {
        timeField: 'timestamp',
        valueField: 'productivity',
        interval,
        metrics: ['count', 'avg', 'min', 'max']
      }
    );
    
    const timeSpentSeries = await this.analyticsPipeline.analyzeTimeSeries(
      flatEntries,
      {
        timeField: 'timestamp',
        valueField: 'timeSpent',
        interval,
        metrics: ['sum', 'avg', 'max']
      }
    );
    
    const techUsageSeries = await this.analyticsPipeline.analyzeTimeSeries(
      flatEntries,
      {
        timeField: 'timestamp',
        valueField: 'techCount',
        interval,
        metrics: ['sum', 'avg']
      }
    );
    
    return {
      generatedAt: moment().toISOString(),
      period: days,
      interval,
      series: {
        productivity: productivitySeries,
        timeSpent: timeSpentSeries,
        technologyUsage: techUsageSeries
      },
      performance: this.analyticsPipeline.getMetrics()
    };
  }

  // Aggregated insights with high-performance processing
  async generateAggregatedInsights(days = 30) {
    await this.initialize();
    
    const entries = await this.getEntriesForPeriod(days);
    const validatedEntries = this.validateEntries(entries);
    
    // Flatten and structure data for aggregation
    const flatEntries = [];
    validatedEntries.forEach(day => {
      day.entries.forEach(entry => {
        flatEntries.push({
          date: day.date,
          productivity: entry.productivity,
          productivityNumeric: this.productivityToNumeric(entry.productivity),
          timeSpent: entry.timeSpent || 0,
          technologies: entry.technologies || [],
          mood: entry.mood,
          timestamp: entry.timestamp
        });
      });
    });
    
    // Use analytics pipeline for aggregation
    const aggregations = await this.analyticsPipeline.aggregate(flatEntries, {
      totalEntries: { type: 'count' },
      avgProductivity: { type: 'avg', field: 'productivityNumeric' },
      totalTimeSpent: { type: 'sum', field: 'timeSpent' },
      avgTimeSpent: { type: 'avg', field: 'timeSpent' },
      maxTimeSpent: { type: 'max', field: 'timeSpent' },
      uniqueTechnologies: { type: 'unique', field: 'technologies' }
    });
    
    return {
      generatedAt: moment().toISOString(),
      period: days,
      insights: {
        entries: aggregations.totalEntries,
        productivity: {
          average: parseFloat(aggregations.avgProductivity.average?.toFixed(2) || 0),
          distribution: this.calculateProductivityDistribution(flatEntries)
        },
        timeSpent: {
          total: aggregations.totalTimeSpent,
          average: parseFloat(aggregations.avgTimeSpent.average?.toFixed(2) || 0),
          maximum: aggregations.maxTimeSpent
        },
        technologies: {
          unique: aggregations.uniqueTechnologies.count,
          totalUsage: aggregations.uniqueTechnologies.values.flat().length,
          topTechnologies: this.getTopTechnologies(flatEntries, 5)
        }
      },
      performance: this.analyticsPipeline.getMetrics()
    };
  }

  calculateProductivityDistribution(entries) {
    const distribution = {};
    entries.forEach(entry => {
      if (entry.productivity) {
        distribution[entry.productivity] = (distribution[entry.productivity] || 0) + 1;
      }
    });
    return distribution;
  }

  getTopTechnologies(entries, limit = 5) {
    const techCount = {};
    entries.forEach(entry => {
      entry.technologies.forEach(tech => {
        techCount[tech] = (techCount[tech] || 0) + 1;
      });
    });
    
    return Object.entries(techCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([tech, count]) => ({ technology: tech, count }));
  }

  // Graceful shutdown for cleanup
  async shutdown() {
    console.log('🔄 Shutting down Analytics systems...');
    
    if (this.performanceEngine) {
      await this.performanceEngine.shutdown();
    }
    
    if (this.eventSystem) {
      await this.eventSystem.shutdown();
    }
    
    this.clearCache();
    console.log('✅ Analytics shutdown complete');
  }
}

module.exports = Analytics;
