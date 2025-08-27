const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const Journal = require('./journal');
const Analytics = require('./analytics');

class DataExporter {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.exportDir = path.join(this.dataDir, 'exports');
    this.journal = new Journal();
    this.analytics = new Analytics();
  }

  async exportData(format = 'json', options = {}) {
    await fs.ensureDir(this.exportDir);
    
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const filename = `journal-export-${timestamp}.${format}`;
    const exportPath = path.join(this.exportDir, filename);

    try {
      const data = await this.prepareExportData(options);
      
      switch (format.toLowerCase()) {
        case 'json':
          await this.exportJSON(data, exportPath);
          break;
        case 'csv':
          await this.exportCSV(data, exportPath);
          break;
        case 'md':
        case 'markdown':
          await this.exportMarkdown(data, exportPath);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return {
        success: true,
        path: exportPath,
        filename: filename,
        format: format,
        timestamp: timestamp
      };
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  async prepareExportData(options) {
    const days = options.days || 365;
    const includeAnalytics = options.analytics !== false;
    
    const entries = await this.journal.getEntries(days);
    const goals = await this.journal.listGoals();
    const config = await fs.readJson(path.join(this.dataDir, 'config.json')).catch(() => ({}));
    
    let analytics = null;
    if (includeAnalytics) {
      analytics = await this.analytics.generateStats(days);
    }

    return {
      metadata: {
        exported: moment().toISOString(),
        version: '1.0.0',
        period: days,
        totalEntries: entries.length
      },
      config: config,
      entries: entries,
      goals: goals,
      analytics: analytics
    };
  }

  async exportJSON(data, exportPath) {
    await fs.writeJson(exportPath, data, { spaces: 2 });
  }

  async exportCSV(data, exportPath) {
    const csvRows = ['Date,Type,Message,Mood,Productivity,Technologies,Hours'];
    
    data.entries.forEach(day => {
      day.entries.forEach(entry => {
        const technologies = Array.isArray(entry.technologies) 
          ? entry.technologies.join('; ') 
          : (entry.technologies || '');
        
        const row = [
          day.date,
          entry.type || '',
          `"${entry.message?.replace(/"/g, '""') || ''}"`,
          entry.mood || '',
          entry.productivity || '',
          `"${technologies}"`,
          entry.timeSpent || 0
        ].join(',');
        
        csvRows.push(row);
      });
    });

    await fs.writeFile(exportPath, csvRows.join('\n'));
  }

  async exportMarkdown(data, exportPath) {
    let markdown = `# Development Journal Export\n\n`;
    markdown += `**Exported:** ${moment(data.metadata.exported).format('MMMM DD, YYYY [at] HH:mm')}\n`;
    markdown += `**Period:** ${data.metadata.period} days\n`;
    markdown += `**Total Entries:** ${data.metadata.totalEntries}\n\n`;

    if (data.analytics) {
      markdown += `## Analytics Summary\n\n`;
      markdown += `- **Current Streak:** ${data.analytics.summary.currentStreak} days\n`;
      markdown += `- **Longest Streak:** ${data.analytics.summary.longestStreak} days\n`;
      markdown += `- **Average Productivity:** ${data.analytics.productivity.average}/5.0\n`;
      markdown += `- **Total Hours:** ${data.analytics.timeSpent.total}h\n`;
      markdown += `- **Technologies Used:** ${data.analytics.technologies.total}\n\n`;
    }

    if (data.goals && data.goals.length > 0) {
      markdown += `## Goals\n\n`;
      data.goals.forEach(goal => {
        const status = goal.completed ? '✅' : '⏳';
        markdown += `- ${status} **${goal.title}**\n`;
        if (goal.completed && goal.completedDate) {
          markdown += `  - Completed: ${goal.completedDate}\n`;
        }
        markdown += `  - Created: ${goal.createdDate}\n`;
      });
      markdown += `\n`;
    }

    markdown += `## Journal Entries\n\n`;
    
    data.entries.forEach(day => {
      markdown += `### ${moment(day.date).format('MMMM DD, YYYY')}\n\n`;
      
      day.entries.forEach(entry => {
        markdown += `**${moment(entry.timestamp).format('HH:mm')}** - ${entry.type || 'General'}\n\n`;
        markdown += `${entry.message}\n\n`;
        
        if (entry.technologies && entry.technologies.length > 0) {
          markdown += `*Technologies:* ${entry.technologies.join(', ')}\n`;
        }
        if (entry.mood) {
          markdown += `*Mood:* ${entry.mood}\n`;
        }
        if (entry.productivity) {
          markdown += `*Productivity:* ${entry.productivity}\n`;
        }
        if (entry.timeSpent) {
          markdown += `*Time Spent:* ${entry.timeSpent}h\n`;
        }
        markdown += `\n---\n\n`;
      });
    });

    await fs.writeFile(exportPath, markdown);
  }

  async listExports() {
    try {
      const files = await fs.readdir(this.exportDir);
      const exports = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(this.exportDir, filename);
          const stats = await fs.stat(filePath);
          const extension = path.extname(filename).toLowerCase().slice(1);
          
          return {
            filename: filename,
            path: filePath,
            format: extension,
            size: stats.size,
            created: stats.mtime,
            formattedSize: this.formatFileSize(stats.size)
          };
        })
      );
      
      return exports.sort((a, b) => b.created - a.created);
    } catch (error) {
      return [];
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = DataExporter;
