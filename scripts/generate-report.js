#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const Analytics = require('../src/analytics');

class ReportGenerator {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.reportsDir = path.join(this.dataDir, 'reports');
    this.analytics = new Analytics();
  }

  async generateAllReports() {
    console.log('Generating comprehensive reports...');
    
    try {
      await fs.ensureDir(this.reportsDir);
      
      await this.generateDailyReport();
      await this.generateMonthlyReport();
      await this.generateProgressReport();
      await this.generateTechnologyReport();
      
      console.log('All reports generated successfully!');
    } catch (error) {
      console.error('Report generation failed:', error);
      throw error;
    }
  }

  async generateDailyReport() {
    const today = moment().format('YYYY-MM-DD');
    const reportFile = path.join(this.reportsDir, 'daily', `${today}.json`);
    
    await fs.ensureDir(path.dirname(reportFile));
    
    const dailyStats = await this.analytics.generateStats(1);
    const weeklyComparison = await this.analytics.generateStats(7);
    
    const report = {
      date: today,
      generated: moment().toISOString(),
      type: 'daily',
      stats: dailyStats,
      weeklyComparison: {
        averageProductivity: weeklyComparison.productivity.average,
        totalHours: weeklyComparison.timeSpent.total,
        streak: weeklyComparison.summary.currentStreak
      },
      highlights: this.generateDailyHighlights(dailyStats),
      nextSteps: this.generateNextSteps(dailyStats)
    };
    
    await fs.writeJson(reportFile, report, { spaces: 2 });
    console.log('Generated daily report');
  }

  async generateMonthlyReport() {
    const today = moment();
    const monthStart = today.clone().startOf('month');
    const reportFile = path.join(this.reportsDir, 'monthly', `${monthStart.format('YYYY-MM')}.json`);
    
    await fs.ensureDir(path.dirname(reportFile));
    
    const daysInMonth = today.date();
    const monthlyStats = await this.analytics.generateStats(daysInMonth);
    
    const report = {
      month: monthStart.format('YYYY-MM'),
      generated: moment().toISOString(),
      type: 'monthly',
      period: {
        start: monthStart.format('YYYY-MM-DD'),
        end: today.format('YYYY-MM-DD'),
        daysAnalyzed: daysInMonth
      },
      stats: monthlyStats,
      trends: await this.analyzeTrends(monthlyStats),
      achievements: this.summarizeMonthlyAchievements(monthlyStats),
      goals: await this.getGoalsProgress()
    };
    
    await fs.writeJson(reportFile, report, { spaces: 2 });
    console.log('Generated monthly report');
  }

  async generateProgressReport() {
    const reportFile = path.join(this.reportsDir, 'progress-summary.json');
    
    const allTimeStats = await this.analytics.generateStats(365); // Last year
    const configFile = path.join(this.dataDir, 'config.json');
    const config = await fs.readJson(configFile).catch(() => ({}));
    
    const startDate = moment(config.startDate || moment().subtract(30, 'days'));
    const daysSinceStart = moment().diff(startDate, 'days');
    
    const report = {
      generated: moment().toISOString(),
      type: 'progress',
      journeyStart: startDate.format('YYYY-MM-DD'),
      daysSinceStart: daysSinceStart,
      overallStats: allTimeStats,
      milestones: this.calculateMilestones(allTimeStats, config),
      growth: this.calculateGrowthMetrics(allTimeStats, daysSinceStart),
      projections: this.generateProjections(allTimeStats, daysSinceStart)
    };
    
    await fs.writeJson(reportFile, report, { spaces: 2 });
    console.log('Generated progress report');
  }

  async generateTechnologyReport() {
    const reportFile = path.join(this.reportsDir, 'technology-analysis.json');
    
    const stats = await this.analytics.generateStats(90); // Last 3 months
    
    const report = {
      generated: moment().toISOString(),
      type: 'technology',
      period: '90 days',
      summary: {
        totalTechnologies: stats.technologies.total,
        mostUsedTechnologies: stats.technologies.mostUsed,
        diversity: this.calculateTechDiversity(stats.technologies)
      },
      recommendations: this.generateTechRecommendations(stats.technologies),
      learningPath: this.suggestLearningPath(stats.technologies)
    };
    
    await fs.writeJson(reportFile, report, { spaces: 2 });
    console.log('Generated technology report');
  }

  generateDailyHighlights(stats) {
    const highlights = [];
    
    if (stats.summary.totalEntries > 0) {
      highlights.push(`Created ${stats.summary.totalEntries} journal entries today`);
    }
    
    if (stats.timeSpent.total > 0) {
      highlights.push(`Spent ${stats.timeSpent.total} hours coding`);
    }
    
    if (stats.achievements.length > 0) {
      highlights.push(`Earned ${stats.achievements.length} achievements`);
    }
    
    return highlights;
  }

  generateNextSteps(stats) {
    const steps = [];
    
    if (stats.productivity.average < 3) {
      steps.push('Consider breaking down complex tasks into smaller, manageable chunks');
    }
    
    if (stats.technologies.total < 2) {
      steps.push('Explore a new technology or tool to expand your skillset');
    }
    
    if (stats.timeSpent.total < 2) {
      steps.push('Try to dedicate more time to coding practice tomorrow');
    }
    
    return steps;
  }

  async analyzeTrends(stats) {
    return {
      productivity: {
        trend: stats.productivity.average > 3.5 ? 'increasing' : 
               stats.productivity.average < 2.5 ? 'decreasing' : 'stable',
        average: stats.productivity.average
      },
      activity: {
        trend: stats.summary.currentStreak > 7 ? 'highly active' :
               stats.summary.currentStreak > 3 ? 'active' : 'needs improvement',
        streak: stats.summary.currentStreak
      },
      learning: {
        diversityScore: stats.technologies.total / Math.max(1, stats.summary.totalDays),
        newTechnologies: stats.technologies.total
      }
    };
  }

  summarizeMonthlyAchievements(stats) {
    return {
      totalAchievements: stats.achievements.length,
      streakAchievement: stats.summary.longestStreak,
      productivityMilestone: stats.productivity.average > 4,
      diversityGoal: stats.technologies.total > 5
    };
  }

  async getGoalsProgress() {
    const goalsFile = path.join(this.dataDir, 'goals.json');
    try {
      const goals = await fs.readJson(goalsFile);
      return {
        total: goals.length,
        completed: goals.filter(g => g.completed).length,
        active: goals.filter(g => !g.completed).length
      };
    } catch {
      return { total: 0, completed: 0, active: 0 };
    }
  }

  calculateMilestones(stats, config) {
    const milestones = [];
    
    if (stats.summary.totalEntries >= 100) {
      milestones.push({ name: 'Century Writer', description: '100+ journal entries' });
    }
    
    if (stats.summary.longestStreak >= 30) {
      milestones.push({ name: 'Monthly Commitment', description: '30+ day streak' });
    }
    
    if (stats.technologies.total >= 20) {
      milestones.push({ name: 'Tech Explorer', description: '20+ technologies used' });
    }
    
    return milestones;
  }

  calculateGrowthMetrics(stats, days) {
    return {
      entriesPerDay: (stats.summary.totalEntries / Math.max(1, days)).toFixed(2),
      hoursPerDay: (stats.timeSpent.total / Math.max(1, days)).toFixed(2),
      techGrowthRate: (stats.technologies.total / Math.max(1, days) * 7).toFixed(2) // per week
    };
  }

  generateProjections(stats, days) {
    const dailyAverage = stats.summary.totalEntries / Math.max(1, days);
    
    return {
      nextMonth: {
        expectedEntries: Math.round(dailyAverage * 30),
        expectedHours: Math.round(stats.timeSpent.total / days * 30)
      },
      nextYear: {
        expectedEntries: Math.round(dailyAverage * 365),
        expectedHours: Math.round(stats.timeSpent.total / days * 365)
      }
    };
  }

  calculateTechDiversity(techStats) {
    const total = techStats.total;
    const topUsage = techStats.mostUsed[0] ? techStats.mostUsed[0][1] : 0;
    
    return {
      score: total > 0 ? (1 - (topUsage / (topUsage + total - 1))) : 0,
      level: total > 10 ? 'high' : total > 5 ? 'medium' : 'low'
    };
  }

  generateTechRecommendations(techStats) {
    const recommendations = [];
    
    if (techStats.total < 5) {
      recommendations.push('Explore more technologies to broaden your skillset');
    }
    
    if (techStats.mostUsed.length > 0) {
      const topTech = techStats.mostUsed[0][0];
      recommendations.push(`Consider advanced topics in ${topTech}`);
    }
    
    return recommendations;
  }

  suggestLearningPath(techStats) {
    const suggestions = [
      'Focus on mastering fundamentals in your most-used technologies',
      'Explore complementary tools and frameworks',
      'Practice building projects that combine multiple technologies',
      'Study best practices and design patterns',
      'Contribute to open source projects'
    ];
    
    return suggestions.slice(0, 3);
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new ReportGenerator();
  generator.generateAllReports().catch(console.error);
}

module.exports = ReportGenerator;
