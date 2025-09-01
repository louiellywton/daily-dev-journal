#!/usr/bin/env node

/**
 * Lightweight README Updater
 * 
 * Updates README statistics using pre-computed analytics data
 * Avoids calling heavy Analytics system to prevent timeouts
 */

const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

class LightweightReadmeUpdater {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.readmePath = path.join(__dirname, '..', 'README.md');
    this.analyticsFile = path.join(this.dataDir, 'analytics.json');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.goalsFile = path.join(this.dataDir, 'goals.json');
  }

  async updateReadme() {
    console.log('Updating README statistics (lightweight mode)...');
    
    try {
      // Load pre-computed data instead of computing new analytics
      const analytics = await this.loadAnalytics();
      const config = await this.loadConfig();
      const goals = await this.loadGoals();
      
      let readmeContent = await fs.readFile(this.readmePath, 'utf8').catch(() => '');
      
      // If README doesn't exist or is too short, create basic template
      if (!readmeContent || readmeContent.length < 100) {
        readmeContent = this.createMinimalReadmeTemplate();
      }
      
      // Update statistics section using pre-computed data
      readmeContent = this.updateStatsSection(readmeContent, analytics, config, goals);
      
      // Update timestamp
      readmeContent = this.updateTimestamp(readmeContent);
      
      await fs.writeFile(this.readmePath, readmeContent);
      
      console.log('README updated successfully with latest statistics!');
    } catch (error) {
      console.warn('README update failed:', error.message);
      // Don't throw - this is not critical enough to fail the whole workflow
    }
  }

  async loadAnalytics() {
    try {
      const analytics = await fs.readJson(this.analyticsFile);
      return analytics.stats || {};
    } catch {
      return this.getDefaultStats();
    }
  }

  async loadConfig() {
    try {
      return await fs.readJson(this.configFile);
    } catch {
      return {
        startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }
  }

  async loadGoals() {
    try {
      const goals = await fs.readJson(this.goalsFile);
      return goals.goals || [];
    } catch {
      return [];
    }
  }

  getDefaultStats() {
    return {
      period: 30,
      summary: { totalDays: 0, totalEntries: 0, currentStreak: 0, longestStreak: 0 },
      productivity: { average: 0, distribution: {} },
      technologies: { total: 0, mostUsed: [] },
      timeSpent: { total: 0, average: 0 }
    };
  }

  createMinimalReadmeTemplate() {
    return `# Daily Dev Journal

A comprehensive daily development journal and productivity tracker for developers. Track your coding progress, analyze your productivity patterns, and achieve your development goals.

## Features

- **Daily Journaling**: Log your daily coding activities, mood, and productivity
- **Goal Tracking**: Set and track learning goals and milestones  
- **Analytics & Insights**: Generate detailed reports on your development progress
- **Technology Tracking**: Monitor which technologies you're using and learning
- **Automated Reports**: Daily, weekly, and monthly progress reports
- **Streak Tracking**: Maintain coding streaks and build consistent habits

## Current Statistics

<!-- STATS_START -->
<!-- STATS_END -->

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/daily-dev-journal.git

# Navigate to project directory
cd daily-dev-journal

# Install dependencies
npm install

# Start using the journal
npm start
\`\`\`

## Usage

### Create a Journal Entry
\`\`\`bash
# Interactive entry
node src/index.js entry

# Quick entry with message
node src/index.js entry -m "Worked on React components" -t "feature"
\`\`\`

### View Statistics
\`\`\`bash
# View 30-day statistics
node src/index.js stats

# View custom period
node src/index.js stats -d 7
\`\`\`

### Manage Goals
\`\`\`bash
# Add a goal
node src/index.js goals -a "Learn TypeScript"

# List all goals
node src/index.js goals -l

# Complete a goal
node src/index.js goals -c GOAL_ID
\`\`\`

## Automation

This project includes GitHub Actions for daily automation:

- **Daily Updates**: Automatic data processing and insights generation
- **Weekly Reports**: Comprehensive progress summaries  
- **Statistics Updates**: README and documentation updates
- **Data Maintenance**: Cleanup and optimization tasks

---

*Last updated: <!-- TIMESTAMP_PLACEHOLDER -->*
`;
  }

  updateStatsSection(content, analytics, config, goals) {
    const stats = analytics.summary || {};
    const productivity = analytics.productivity || {};
    const technologies = analytics.technologies || {};
    const timeSpent = analytics.timeSpent || {};
    
    const startDate = moment(config.startDate || moment().subtract(30, 'days'));
    const daysSinceStart = Math.max(1, moment().diff(startDate, 'days'));
    
    const completedGoals = goals.filter(g => g.completed).length;
    const totalGoals = goals.length;
    
    const statsSection = `
| Metric | Value |
|--------|-------|
| **Days Tracked** | ${stats.totalDays || 0} days |
| **Total Entries** | ${config.totalEntries || 0} entries |
| **Current Streak** | ${config.currentStreak || 0} days |
| **Longest Streak** | ${config.longestStreak || 0} days |
| **Total Hours** | ${Math.floor(timeSpent.total || 0)}h |
| **Avg Productivity** | ${productivity.average || 0}/5.0 |
| **Technologies Used** | ${technologies.total || 0} different |
| **Goals Progress** | ${completedGoals}/${totalGoals} completed |
| **Journey Started** | ${startDate.format('MMM DD, YYYY')} (${daysSinceStart} days ago) |

### Recent Activity
- Last updated: ${moment().format('MMM DD, YYYY HH:mm')} UTC
- Analytics period: ${analytics.period || 30} days
- System status: Active and tracking

### Top Technologies (Recent)
${technologies.mostUsed && technologies.mostUsed.length > 0
  ? technologies.mostUsed.slice(0, 5).map(([tech, count], i) => 
      `${i + 1}. **${tech}** (${count} uses)`
    ).join('\n')
  : '- Keep coding to see technology statistics!'
}

### Active Goals
${totalGoals > 0 
  ? goals.filter(g => !g.completed).slice(0, 3).map(g => `- ${g.title}`).join('\n') || '- All goals completed! Add new ones.'
  : '- No goals set yet. Add some learning goals!'
}
`;

    // Replace or insert stats section
    const statsStartMarker = '<!-- STATS_START -->';
    const statsEndMarker = '<!-- STATS_END -->';
    
    if (content.includes(statsStartMarker) && content.includes(statsEndMarker)) {
      // Replace existing stats section
      const beforeStats = content.substring(0, content.indexOf(statsStartMarker) + statsStartMarker.length);
      const afterStats = content.substring(content.indexOf(statsEndMarker));
      return beforeStats + statsSection + afterStats;
    } else {
      // Insert stats section after "## Current Statistics"
      const statsHeader = '## Current Statistics';
      if (content.includes(statsHeader)) {
        const insertIndex = content.indexOf(statsHeader) + statsHeader.length;
        const before = content.substring(0, insertIndex);
        const after = content.substring(insertIndex);
        return before + '\n\n' + statsStartMarker + statsSection + statsEndMarker + '\n' + after;
      } else {
        // Append to end
        return content + '\n\n## Current Statistics\n\n' + statsStartMarker + statsSection + statsEndMarker + '\n';
      }
    }
  }

  updateTimestamp(content) {
    const timestamp = moment().format('MMM DD, YYYY HH:mm') + ' UTC';
    return content.replace('<!-- TIMESTAMP_PLACEHOLDER -->', timestamp);
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new LightweightReadmeUpdater();
  updater.updateReadme().catch(error => {
    console.error('Lightweight README updater failed:', error);
    process.exit(1);
  });
}

module.exports = LightweightReadmeUpdater;
