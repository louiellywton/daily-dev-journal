#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const LogOptimizer = require('../src/log-optimizer');

class DataManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.entriesDir = path.join(this.dataDir, 'entries');
    this.archiveDir = path.join(this.dataDir, 'archives');
    this.reportsDir = path.join(this.dataDir, 'reports');
  }

  async archiveOldData(monthsOld = 12, preserveOriginals = true) {
    console.log(`Archiving data older than ${monthsOld} months (preserving all originals for historical record)...`);
    
    try {
      await fs.ensureDir(this.archiveDir);
      
      const cutoffDate = moment().subtract(monthsOld, 'months');
      const files = await fs.readdir(this.entriesDir);
      let archivedCount = 0;
      
      // Group files by year for efficient archiving
      const yearGroups = {};
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const dateStr = file.replace('.json', '');
        const fileDate = moment(dateStr, 'YYYY-MM-DD');
        
        if (fileDate.isBefore(cutoffDate)) {
          const year = fileDate.year();
          if (!yearGroups[year]) {
            yearGroups[year] = [];
          }
          yearGroups[year].push({
            file,
            date: dateStr,
            path: path.join(this.entriesDir, file)
          });
        }
      }
      
      // Create year-based archives (but keep originals)
      for (const [year, entries] of Object.entries(yearGroups)) {
        const yearArchive = path.join(this.archiveDir, `${year}-archive.json`);
        const yearCompressed = path.join(this.archiveDir, `${year}-compressed.json`);
        
        // Read existing archive or create new one
        let existingArchive = {};
        if (await fs.pathExists(yearArchive)) {
          existingArchive = await fs.readJson(yearArchive);
        }
        
        // Add entries to archive (but keep originals)
        for (const entry of entries) {
          const entryData = await fs.readJson(entry.path);
          existingArchive[entry.date] = entryData;
          archivedCount++;
          
          // IMPORTANT: We preserve the original files for historical proof!
          // Only create archive copies, never delete originals
        }
        
        // Save archive copy
        await fs.writeJson(yearArchive, existingArchive, { spaces: 2 });
        
        // Create compressed version for storage efficiency
        await fs.writeJson(yearCompressed, existingArchive, { spaces: 0 });
        
        console.log(`Archived ${entries.length} entries for year ${year} (originals preserved)`);
      }
      
      console.log(`Successfully archived ${archivedCount} entries while preserving all original files for historical record`);
      return archivedCount;
      
    } catch (error) {
      console.error('Archival failed:', error);
      throw error;
    }
  }

  async compressOldReports(daysOld = 90, preserveOriginals = true) {
    console.log(`Compressing reports older than ${daysOld} days (preserving all originals for historical record)...`);
    
    try {
      const cutoffDate = moment().subtract(daysOld, 'days');
      let compressedCount = 0;
      
      // Create compressed reports directory
      const compressedReportsDir = path.join(this.reportsDir, 'compressed');
      await fs.ensureDir(compressedReportsDir);
      
      // Compress daily reports
      const dailyReportsDir = path.join(this.reportsDir, 'daily');
      if (await fs.pathExists(dailyReportsDir)) {
        const dailyReports = await fs.readdir(dailyReportsDir);
        const oldReports = {};
        
        for (const report of dailyReports) {
          if (!report.endsWith('.json')) continue;
          
          const dateStr = report.replace('.json', '');
          const reportDate = moment(dateStr, 'YYYY-MM-DD');
          
          if (reportDate.isBefore(cutoffDate)) {
            const reportData = await fs.readJson(path.join(dailyReportsDir, report));
            const yearMonth = reportDate.format('YYYY-MM');
            
            if (!oldReports[yearMonth]) {
              oldReports[yearMonth] = {};
            }
            oldReports[yearMonth][dateStr] = reportData;
            compressedCount++;
            
            // IMPORTANT: We keep the original files for historical proof!
            // Only create compressed archives, never delete originals
          }
        }
        
        // Save compressed monthly archives
        for (const [yearMonth, reports] of Object.entries(oldReports)) {
          const compressedFile = path.join(compressedReportsDir, `reports-${yearMonth}.json`);
          await fs.writeJson(compressedFile, reports, { spaces: 0 }); // No formatting for compression
        }
      }
      
      console.log(`Compressed ${compressedCount} old reports while preserving all original files for historical record`);
      return compressedCount;
      
    } catch (error) {
      console.error('Report compression failed:', error);
      throw error;
    }
  }

  async optimizeDataStructure() {
    console.log('Optimizing data structure...');
    
    try {
      // Consolidate weekly data into monthly summaries
      const weeklyReports = path.join(this.reportsDir, 'weekly');
      if (await fs.pathExists(weeklyReports)) {
        const reports = await fs.readdir(weeklyReports);
        const monthlyData = {};
        
        for (const report of reports) {
          if (!report.startsWith('week-') || !report.endsWith('.json')) continue;
          
          const reportData = await fs.readJson(path.join(weeklyReports, report));
          const weekStart = moment(reportData.period.start);
          const monthKey = weekStart.format('YYYY-MM');
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              weeks: [],
              summary: {
                totalHours: 0,
                totalEntries: 0,
                technologies: new Set()
              }
            };
          }
          
          monthlyData[monthKey].weeks.push(reportData);
          monthlyData[monthKey].summary.totalHours += reportData.summary.totalHours;
          monthlyData[monthKey].summary.totalEntries += reportData.stats.summary.totalEntries;
          
          // Aggregate technologies
          if (reportData.stats.technologies.mostUsed) {
            reportData.stats.technologies.mostUsed.forEach(([tech]) => {
              monthlyData[monthKey].summary.technologies.add(tech);
            });
          }
        }
        
        // Save consolidated monthly data
        const monthlyReportsDir = path.join(this.reportsDir, 'monthly');
        await fs.ensureDir(monthlyReportsDir);
        
        for (const [month, data] of Object.entries(monthlyData)) {
          data.summary.technologies = Array.from(data.summary.technologies);
          await fs.writeJson(
            path.join(monthlyReportsDir, `consolidated-${month}.json`), 
            data, 
            { spaces: 2 }
          );
        }
        
        console.log(`Consolidated ${Object.keys(monthlyData).length} months of data`);
      }
      
    } catch (error) {
      console.error('Data optimization failed:', error);
      throw error;
    }
  }

  async getDataStats() {
    try {
      const stats = {
        entries: 0,
        archives: 0,
        reports: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
      
      // Count entries
      if (await fs.pathExists(this.entriesDir)) {
        const entryFiles = await fs.readdir(this.entriesDir);
        stats.entries = entryFiles.filter(f => f.endsWith('.json')).length;
        
        // Find date range
        const dates = entryFiles
          .filter(f => f.endsWith('.json'))
          .map(f => f.replace('.json', ''))
          .sort();
        
        if (dates.length > 0) {
          stats.oldestEntry = dates[0];
          stats.newestEntry = dates[dates.length - 1];
        }
      }
      
      // Count archives
      if (await fs.pathExists(this.archiveDir)) {
        const archiveFiles = await fs.readdir(this.archiveDir);
        stats.archives = archiveFiles.filter(f => f.endsWith('.json')).length;
      }
      
      // Count reports
      if (await fs.pathExists(this.reportsDir)) {
        const reportFiles = await this.countFilesRecursive(this.reportsDir);
        stats.reports = reportFiles;
      }
      
      // Calculate total size
      stats.totalSize = await this.calculateDirectorySize(this.dataDir);
      
      return stats;
    } catch (error) {
      console.error('Failed to get data stats:', error);
      return null;
    }
  }

  async countFilesRecursive(dir) {
    let count = 0;
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        count += await this.countFilesRecursive(itemPath);
      } else if (item.endsWith('.json')) {
        count++;
      }
    }
    
    return count;
  }

  async calculateDirectorySize(dir) {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          totalSize += await this.calculateDirectorySize(itemPath);
        } else {
          totalSize += stat.size;
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getLogStats() {
    try {
      const stats = {
        dailyLogs: 0,
        archivedMonths: 0,
        totalLogSize: 0,
        oldestLog: null,
        newestLog: null,
        logDateRange: null
      };
      
      const logsDir = path.join(this.dataDir, 'logs');
      const archivesDir = path.join(logsDir, 'archives');
      
      // Count daily logs
      if (await fs.pathExists(logsDir)) {
        const logFiles = await fs.readdir(logsDir);
        const dailyLogFiles = logFiles.filter(f => f.endsWith('.log'));
        stats.dailyLogs = dailyLogFiles.length;
        
        // Find date range for daily logs
        if (dailyLogFiles.length > 0) {
          const dates = dailyLogFiles
            .map(f => f.replace('.log', ''))
            .sort();
          stats.oldestLog = dates[0];
          stats.newestLog = dates[dates.length - 1];
        }
      }
      
      // Count archived months
      if (await fs.pathExists(archivesDir)) {
        const archiveFiles = await fs.readdir(archivesDir);
        stats.archivedMonths = archiveFiles.filter(f => f.endsWith('.json')).length;
      }
      
      // Calculate log directory size
      if (await fs.pathExists(logsDir)) {
        stats.totalLogSize = await this.calculateDirectorySize(logsDir);
      }
      
      // Calculate total log coverage
      const totalDays = stats.dailyLogs;
      const totalMonths = stats.archivedMonths;
      const estimatedArchivedDays = totalMonths * 30; // Rough estimate
      
      stats.totalCoverageDays = totalDays + estimatedArchivedDays;
      stats.logDateRange = `${Math.round(stats.totalCoverageDays / 30)} months of logs`;
      
      return stats;
    } catch (error) {
      console.error('Failed to get log stats:', error);
      return null;
    }
  }

  async analyzeLogPattern() {
    const logsDir = path.join(this.dataDir, 'logs');
    const analysis = {
      successRate: 0,
      errorCount: 0,
      totalRuns: 0,
      mostRecentErrors: [],
      runFrequency: 'Unknown'
    };
    
    try {
      if (!await fs.pathExists(logsDir)) {
        return analysis;
      }
      
      const logFiles = await fs.readdir(logsDir);
      const recentLogFiles = logFiles
        .filter(f => f.endsWith('.log'))
        .sort()
        .slice(-30); // Last 30 days
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const logFile of recentLogFiles) {
        const logPath = path.join(logsDir, logFile);
        const logContent = await fs.readFile(logPath, 'utf8');
        
        const logEntries = logContent.trim().split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(entry => entry !== null);
        
        for (const entry of logEntries) {
          if (entry.status === 'success') {
            successCount++;
          } else if (entry.status === 'failed') {
            errorCount++;
            errors.push({
              date: logFile.replace('.log', ''),
              message: entry.message,
              timestamp: entry.timestamp
            });
          }
        }
      }
      
      const totalRuns = successCount + errorCount;
      analysis.successRate = totalRuns > 0 ? ((successCount / totalRuns) * 100).toFixed(1) : 0;
      analysis.errorCount = errorCount;
      analysis.totalRuns = totalRuns;
      analysis.mostRecentErrors = errors.slice(-5); // Last 5 errors
      analysis.runFrequency = recentLogFiles.length > 0 ? `${recentLogFiles.length} days in last 30 days` : 'No recent activity';
      
    } catch (error) {
      console.error('Failed to analyze log patterns:', error);
    }
    
    return analysis;
  }

  async run(command = 'stats', options = {}) {
    console.log('🗂️  Data Management Tool\n');
    
    switch (command) {
      case 'archive':
        return await this.archiveOldData(options.months || 12);
        
      case 'cleanup':
        return await this.cleanupOldReports(options.days || 90);
        
      case 'optimize':
        return await this.optimizeDataStructure();
        
      case 'logs':
        const logStats = await this.getLogStats();
        const logAnalysis = await this.analyzeLogPattern();
        
        if (logStats) {
          console.log('📋 Log Statistics:');
          console.log(`   Daily Logs: ${logStats.dailyLogs} files`);
          console.log(`   Archived Months: ${logStats.archivedMonths} months`);
          console.log(`   Total Coverage: ${logStats.logDateRange}`);
          console.log(`   Log Size: ${this.formatBytes(logStats.totalLogSize)}`);
          console.log(`   Date Range: ${logStats.oldestLog || 'N/A'} to ${logStats.newestLog || 'N/A'}`);
          
          console.log('\n📈 Execution Analysis:');
          console.log(`   Success Rate: ${logAnalysis.successRate}%`);
          console.log(`   Total Runs: ${logAnalysis.totalRuns}`);
          console.log(`   Error Count: ${logAnalysis.errorCount}`);
          console.log(`   Frequency: ${logAnalysis.runFrequency}`);
          
          if (logAnalysis.mostRecentErrors.length > 0) {
            console.log('\n⚠️  Recent Errors:');
            logAnalysis.mostRecentErrors.forEach((error, i) => {
              console.log(`   ${i + 1}. ${error.date}: ${error.message}`);
            });
          }
        }
        return { logStats, logAnalysis };
        
      case 'optimize-logs':
        const optimizer = new LogOptimizer();
        return await optimizer.optimizeLogStorage();
        
      case 'compress-logs':
        const logOptimizer = new LogOptimizer();
        return await logOptimizer.compressDailyLogs(options.days || 7);
        
      case 'logs-stats':
        const logOptimizer2 = new LogOptimizer();
        const optimizedStats = await logOptimizer2.getOptimizedLogStats();
        
        console.log('🚀 Optimized Log Statistics:');
        console.log(`   Daily Logs: ${optimizedStats.dailyLogs} files`);
        console.log(`   Compressed Logs: ${optimizedStats.compressedLogs} files`);
        console.log(`   Yearly Archives: ${optimizedStats.yearlyArchives} years`);
        console.log(`   Total Size: ${this.formatBytes(optimizedStats.totalSize)}`);
        console.log(`   Estimated Uncompressed: ${this.formatBytes(optimizedStats.estimatedUncompressedSize)}`);
        console.log(`   Compression Ratio: ${optimizedStats.compressionRatio}%`);
        console.log(`   Total Coverage: ${Math.round(optimizedStats.totalCoverageDays / 30)} months`);
        
        return optimizedStats;
        
      case 'stats':
      default:
        const stats = await this.getDataStats();
        if (stats) {
          console.log('📊 Data Statistics:');
          console.log(`   Entries: ${stats.entries}`);
          console.log(`   Archives: ${stats.archives}`);
          console.log(`   Reports: ${stats.reports}`);
          console.log(`   Total Size: ${this.formatBytes(stats.totalSize)}`);
          console.log(`   Date Range: ${stats.oldestEntry || 'N/A'} to ${stats.newestEntry || 'N/A'}`);
        }
        return stats;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'stats';
  const options = {};
  
  // Parse simple options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--months' && args[i + 1]) {
      options.months = parseInt(args[i + 1]);
      i++;
    }
    if (args[i] === '--days' && args[i + 1]) {
      options.days = parseInt(args[i + 1]);
      i++;
    }
  }
  
  const manager = new DataManager();
  manager.run(command, options).catch(console.error);
}

module.exports = DataManager;
