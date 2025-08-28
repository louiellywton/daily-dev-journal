const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class LogOptimizer {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.logsDir = path.join(this.dataDir, 'logs');
    this.archiveDir = path.join(this.logsDir, 'archives');
    this.compressedDir = path.join(this.logsDir, 'compressed');
    
    // Log type mappings for compression
    this.typeMap = {
      'daily_update': 'DU',
      'vector_analytics': 'VA', 
      'report_generation': 'RG',
      'data_cleanup': 'DC',
      'error': 'E',
      'success': 'S',
      'warning': 'W',
      'info': 'I'
    };
    
    // Status codes for ultra compression
    this.statusMap = {
      'success': '1',
      'failed': '0',
      'warning': '2',
      'info': '3'
    };
  }

  /**
   * Compress individual log entries using optimized encoding
   */
  compressLogEntry(entry) {
    // Convert full timestamp to relative time (saves ~15 bytes per entry)
    const timestamp = moment(entry.timestamp);
    const dayStart = timestamp.clone().startOf('day');
    const secondsFromMidnight = timestamp.diff(dayStart, 'seconds');
    
    // Ultra-compact log format: T|Type|Status|MessageHash
    const compressedEntry = {
      t: secondsFromMidnight, // Time as seconds from midnight (4 bytes vs 24 bytes)
      y: this.typeMap[entry.type] || entry.type.substring(0, 2).toUpperCase(), // Type (2 chars vs full string)
      s: this.statusMap[entry.status] || entry.status, // Status (1 char vs full string) 
      m: this.hashMessage(entry.message), // Message hash (8 chars vs full message)
      ...(entry.stack && { e: this.compressStackTrace(entry.stack) }) // Compressed stack trace if error
    };
    
    return compressedEntry;
  }

  /**
   * Hash long messages to save space while maintaining uniqueness
   */
  hashMessage(message) {
    // Create short hash of common messages
    const commonMessages = {
      'Daily update completed successfully': 'DU_OK',
      'Vector analytics processing completed': 'VA_OK', 
      'Report generation completed': 'RG_OK',
      'Data cleanup completed': 'DC_OK',
      'Network timeout': 'NET_TO',
      'Memory limit exceeded': 'MEM_LIM',
      'File not found': 'NO_FILE',
      'Permission denied': 'NO_PERM'
    };
    
    if (commonMessages[message]) {
      return commonMessages[message];
    }
    
    // For unique messages, create 8-char hash
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
  }

  /**
   * Compress stack traces by extracting only essential information
   */
  compressStackTrace(stack) {
    if (!stack || typeof stack !== 'string') return null;
    
    // Extract only the first 3 lines of stack trace and remove file paths
    const lines = stack.split('\n').slice(0, 3);
    const compressed = lines.map(line => {
      // Remove full file paths, keep only filename and line number
      return line.replace(/\/.+\//g, '').replace(/\s+/g, ' ').trim();
    }).join('|');
    
    return compressed.substring(0, 100); // Limit to 100 chars
  }

  /**
   * Advanced daily log compression with GZIP
   */
  async compressDailyLogs(daysOld = 7) {
    console.log(`Compressing logs older than ${daysOld} days...`);
    
    await fs.ensureDir(this.compressedDir);
    
    const cutoffDate = moment().subtract(daysOld, 'days');
    const logFiles = await fs.readdir(this.logsDir).catch(() => []);
    let compressedCount = 0;
    let spaceSaved = 0;
    
    for (const logFile of logFiles) {
      if (!logFile.endsWith('.log')) continue;
      
      const filePath = path.join(this.logsDir, logFile);
      const fileDate = moment(logFile.replace('.log', ''), 'YYYY-MM-DD');
      
      if (fileDate.isBefore(cutoffDate)) {
        try {
          const originalSize = (await fs.stat(filePath)).size;
          const logContent = await fs.readFile(filePath, 'utf8');
          
          // Parse and compress log entries
          const logEntries = logContent.trim().split('\n')
            .filter(line => line.trim())
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return null;
              }
            })
            .filter(entry => entry !== null)
            .map(entry => this.compressLogEntry(entry));
          
          // Create compressed daily summary
          const compressedLog = {
            d: fileDate.format('YYYY-MM-DD'), // Date
            e: logEntries, // Entries (compressed)
            c: logEntries.length, // Count
            v: '2.0' // Compression version
          };
          
          // GZIP the JSON
          const jsonString = JSON.stringify(compressedLog);
          const gzipBuffer = await gzip(jsonString);
          
          // Save compressed file
          const compressedPath = path.join(this.compressedDir, `${fileDate.format('YYYY-MM-DD')}.json.gz`);
          await fs.writeFile(compressedPath, gzipBuffer);
          
          // Remove original
          await fs.remove(filePath);
          
          const compressedSize = gzipBuffer.length;
          spaceSaved += (originalSize - compressedSize);
          compressedCount++;
          
          console.log(`Compressed ${logFile}: ${originalSize}B → ${compressedSize}B (${((1 - compressedSize/originalSize) * 100).toFixed(1)}% reduction)`);
          
        } catch (error) {
          console.error(`Failed to compress ${logFile}:`, error.message);
        }
      }
    }
    
    console.log(`Compressed ${compressedCount} log files, saved ${this.formatBytes(spaceSaved)}`);
    return { compressedCount, spaceSaved };
  }

  /**
   * Create ultra-compact yearly archives
   */
  async createYearlyArchive(year) {
    console.log(`Creating yearly archive for ${year}...`);
    
    const yearlyArchiveDir = path.join(this.logsDir, 'yearly');
    await fs.ensureDir(yearlyArchiveDir);
    
    // Collect all compressed files for the year
    const compressedFiles = await fs.readdir(this.compressedDir).catch(() => []);
    const yearFiles = compressedFiles
      .filter(file => file.startsWith(year.toString()) && file.endsWith('.json.gz'))
      .sort();
    
    if (yearFiles.length === 0) {
      console.log(`No compressed files found for year ${year}`);
      return;
    }
    
    const yearlyData = {
      year: year,
      months: {},
      totalDays: 0,
      totalEntries: 0,
      successRate: 0,
      compressed: true,
      version: '2.0'
    };
    
    let totalSuccesses = 0;
    let totalRuns = 0;
    
    for (const file of yearFiles) {
      const filePath = path.join(this.compressedDir, file);
      
      try {
        const gzipBuffer = await fs.readFile(filePath);
        const jsonString = await gunzip(gzipBuffer);
        const dayData = JSON.parse(jsonString.toString());
        
        const month = moment(dayData.d).format('YYYY-MM');
        
        if (!yearlyData.months[month]) {
          yearlyData.months[month] = {
            days: {},
            summary: { entries: 0, successes: 0, errors: 0 }
          };
        }
        
        // Store day data with ultra compression
        yearlyData.months[month].days[dayData.d] = {
          c: dayData.c, // Count
          s: dayData.e.filter(e => e.s === '1').length, // Successes  
          e: dayData.e.filter(e => e.s === '0').length  // Errors
        };
        
        yearlyData.totalDays++;
        yearlyData.totalEntries += dayData.c;
        
        const daySuccesses = yearlyData.months[month].days[dayData.d].s;
        const dayTotal = dayData.c;
        
        totalSuccesses += daySuccesses;
        totalRuns += dayTotal;
        
        yearlyData.months[month].summary.entries += dayTotal;
        yearlyData.months[month].summary.successes += daySuccesses;
        yearlyData.months[month].summary.errors += (dayTotal - daySuccesses);
        
        // Remove the daily compressed file after archiving
        await fs.remove(filePath);
        
      } catch (error) {
        console.error(`Failed to process ${file}:`, error.message);
      }
    }
    
    yearlyData.successRate = totalRuns > 0 ? ((totalSuccesses / totalRuns) * 100).toFixed(1) : 0;
    
    // GZIP the yearly archive
    const yearlyJson = JSON.stringify(yearlyData);
    const yearlyGzip = await gzip(yearlyJson);
    
    const yearlyPath = path.join(yearlyArchiveDir, `${year}.json.gz`);
    await fs.writeFile(yearlyPath, yearlyGzip);
    
    console.log(`Created yearly archive: ${year}.json.gz (${this.formatBytes(yearlyGzip.length)})`);
    console.log(`  - ${yearlyData.totalDays} days, ${yearlyData.totalEntries} entries`);
    console.log(`  - Success rate: ${yearlyData.successRate}%`);
    
    return yearlyData;
  }

  /**
   * Intelligent log retention with automatic optimization
   */
  async optimizeLogStorage() {
    console.log('🚀 Optimizing log storage...\n');
    
    const stats = {
      originalSize: 0,
      optimizedSize: 0,
      filesProcessed: 0,
      spaceSaved: 0
    };
    
    // Step 1: Compress logs older than 7 days
    const compressionResult = await this.compressDailyLogs(7);
    stats.filesProcessed += compressionResult.compressedCount;
    stats.spaceSaved += compressionResult.spaceSaved;
    
    // Step 2: Create yearly archives for completed years
    const currentYear = moment().year();
    const compressedFiles = await fs.readdir(this.compressedDir).catch(() => []);
    
    const years = [...new Set(compressedFiles
      .filter(f => f.endsWith('.json.gz'))
      .map(f => parseInt(f.substring(0, 4)))
      .filter(y => y < currentYear && y > 2020)
    )];
    
    for (const year of years) {
      await this.createYearlyArchive(year);
    }
    
    // Step 3: Calculate total optimization
    const totalLogSize = await this.calculateDirectorySize(this.logsDir);
    
    console.log('\n📊 Optimization Results:');
    console.log(`   Files processed: ${stats.filesProcessed}`);
    console.log(`   Space saved: ${this.formatBytes(stats.spaceSaved)}`);
    console.log(`   Total log size: ${this.formatBytes(totalLogSize)}`);
    console.log(`   Compression ratio: ${stats.spaceSaved > 0 ? ((stats.spaceSaved / (stats.spaceSaved + totalLogSize)) * 100).toFixed(1) : 0}%`);
    
    return stats;
  }

  /**
   * Retrieve logs with automatic decompression
   */
  async readCompressedLogs(startDate, endDate) {
    const logs = [];
    const start = moment(startDate);
    const end = moment(endDate);
    
    let currentDate = start.clone();
    while (currentDate.isSameOrBefore(end)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      
      // Check daily logs first
      const dailyLogPath = path.join(this.logsDir, `${dateStr}.log`);
      if (await fs.pathExists(dailyLogPath)) {
        const content = await fs.readFile(dailyLogPath, 'utf8');
        const entries = content.trim().split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(entry => entry !== null);
        
        logs.push({ date: dateStr, entries, source: 'daily' });
      } else {
        // Check compressed logs
        const compressedPath = path.join(this.compressedDir, `${dateStr}.json.gz`);
        if (await fs.pathExists(compressedPath)) {
          try {
            const gzipBuffer = await fs.readFile(compressedPath);
            const jsonString = await gunzip(gzipBuffer);
            const compressedLog = JSON.parse(jsonString.toString());
            
            // Decompress entries
            const entries = compressedLog.e.map(entry => this.decompressLogEntry(entry, dateStr));
            logs.push({ date: dateStr, entries, source: 'compressed' });
          } catch (error) {
            console.error(`Failed to read compressed log ${dateStr}:`, error.message);
          }
        }
      }
      
      currentDate.add(1, 'day');
    }
    
    return logs;
  }

  /**
   * Decompress log entry back to readable format
   */
  decompressLogEntry(compressed, date) {
    const reverseTypeMap = Object.fromEntries(
      Object.entries(this.typeMap).map(([k, v]) => [v, k])
    );
    
    const reverseStatusMap = Object.fromEntries(
      Object.entries(this.statusMap).map(([k, v]) => [v, k])
    );
    
    const dayStart = moment(date).startOf('day');
    const timestamp = dayStart.clone().add(compressed.t, 'seconds');
    
    return {
      timestamp: timestamp.toISOString(),
      type: reverseTypeMap[compressed.y] || compressed.y,
      status: reverseStatusMap[compressed.s] || compressed.s,
      message: this.decompressMessage(compressed.m),
      ...(compressed.e && { stack: compressed.e })
    };
  }

  /**
   * Decompress message hashes back to readable format
   */
  decompressMessage(hash) {
    const messageMap = {
      'DU_OK': 'Daily update completed successfully',
      'VA_OK': 'Vector analytics processing completed',
      'RG_OK': 'Report generation completed',
      'DC_OK': 'Data cleanup completed',
      'NET_TO': 'Network timeout',
      'MEM_LIM': 'Memory limit exceeded',
      'NO_FILE': 'File not found',
      'NO_PERM': 'Permission denied'
    };
    
    return messageMap[hash] || `[Hash: ${hash}]`;
  }

  /**
   * Get comprehensive log statistics
   */
  async getOptimizedLogStats() {
    const stats = {
      dailyLogs: 0,
      compressedLogs: 0,
      yearlyArchives: 0,
      totalSize: 0,
      estimatedUncompressedSize: 0,
      compressionRatio: 0,
      oldestLog: null,
      newestLog: null,
      totalCoverageDays: 0
    };
    
    // Count daily logs
    const dailyFiles = await fs.readdir(this.logsDir).catch(() => []);
    stats.dailyLogs = dailyFiles.filter(f => f.endsWith('.log')).length;
    
    // Count compressed logs
    if (await fs.pathExists(this.compressedDir)) {
      const compressedFiles = await fs.readdir(this.compressedDir).catch(() => []);
      stats.compressedLogs = compressedFiles.filter(f => f.endsWith('.json.gz')).length;
    }
    
    // Count yearly archives
    const yearlyDir = path.join(this.logsDir, 'yearly');
    if (await fs.pathExists(yearlyDir)) {
      const yearlyFiles = await fs.readdir(yearlyDir).catch(() => []);
      stats.yearlyArchives = yearlyFiles.filter(f => f.endsWith('.json.gz')).length;
    }
    
    // Calculate sizes
    stats.totalSize = await this.calculateDirectorySize(this.logsDir);
    
    // Estimate compression ratio (typical 70-85% reduction)
    stats.estimatedUncompressedSize = stats.totalSize * 4; // Conservative estimate
    stats.compressionRatio = ((1 - stats.totalSize / stats.estimatedUncompressedSize) * 100).toFixed(1);
    
    // Calculate coverage
    stats.totalCoverageDays = stats.dailyLogs + stats.compressedLogs + (stats.yearlyArchives * 365);
    
    return stats;
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
}

module.exports = LogOptimizer;
