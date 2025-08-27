#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const Analytics = require('../src/analytics');

class ReadmeUpdater {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.readmePath = path.join(__dirname, '..', 'README.md');
    this.analytics = new Analytics();
  }

  async updateReadme() {
    console.log('Updating README statistics...');
    
    try {
      const stats = await this.analytics.generateStats(30);
      const allTimeStats = await this.analytics.generateStats(365);
      const configFile = path.join(this.dataDir, 'config.json');
      const config = await fs.readJson(configFile).catch(() => ({}));
      
      let readmeContent = await fs.readFile(this.readmePath, 'utf8').catch(() => '');
      
      // If README doesn't exist, create it with template
      if (!readmeContent) {
        readmeContent = this.createReadmeTemplate();
      }
      
      // Update statistics section
      readmeContent = this.updateStatsSection(readmeContent, stats, allTimeStats, config);
      
      // Update last updated timestamp
      readmeContent = this.updateTimestamp(readmeContent);
      
      await fs.writeFile(this.readmePath, readmeContent);
      
      console.log('README updated successfully!');
    } catch (error) {
      console.error('README update failed:', error);
      throw error;
    }
  }

  createReadmeTemplate() {
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

## Reports

The journal generates various types of reports:

- **Daily Reports**: Summary of daily activities and insights
- **Weekly Reports**: Weekly progress analysis and recommendations
- **Monthly Reports**: Comprehensive monthly reviews
- **Technology Reports**: Analysis of technology usage and learning patterns
- **Progress Reports**: Long-term development journey tracking

## Goals & Achievements

Track your learning goals and unlock achievements as you progress:

- **Streak Achievements**: For maintaining daily coding habits
- **Entry Milestones**: For consistent journaling
- **Technology Explorer**: For learning diverse technologies
- **Analytics Master**: For deep analysis and insights

## Data Structure

The journal stores data in JSON format with the following structure:

\`\`\`
data/
├── entries/           # Daily journal entries
├── goals.json         # Learning goals and progress
├── config.json        # User configuration and stats
├── reports/           # Generated reports and analytics
├── daily-insights/    # AI-generated daily insights
└── logs/             # System logs and maintenance
\`\`\`

## Contributing

Contributions are welcome! Please feel free to submit pull requests, create issues, or suggest new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for developers who want to track and improve their coding journey
- Inspired by the power of consistent daily practice and reflection
- Designed to help build better development habits

---

*Last updated: <!-- TIMESTAMP_PLACEHOLDER -->*
`;
  }

  updateStatsSection(content, stats, allTimeStats, config) {
    const startDate = moment(config.startDate || moment().subtract(30, 'days'));
    const daysSinceStart = moment().diff(startDate, 'days');
    
    const statsSection = `
| Metric | Value |
|--------|-------|
| **Days Tracked** | ${stats.summary.totalDays} days |
| **Total Entries** | ${allTimeStats.summary.totalEntries} entries |
| **Current Streak** | ${stats.summary.currentStreak} days |
| **Longest Streak** | ${allTimeStats.summary.longestStreak} days |
| **Total Hours** | ${allTimeStats.timeSpent.total}h |
| **Avg Productivity** | ${stats.productivity.average}/5.0 |
| **Technologies Used** | ${allTimeStats.technologies.total} different |
| **Achievements** | ${allTimeStats.achievements.length} earned |
| **Journey Started** | ${startDate.format('MMM DD, YYYY')} (${daysSinceStart} days ago) |

### Recent Achievements
${allTimeStats.achievements.length > 0 
  ? allTimeStats.achievements.slice(-3).map(a => `- ${a.title}: ${a.description}`).join('\n')
  : '- No achievements yet - keep coding!'
}

### Top Technologies (Last 30 Days)
${stats.technologies.mostUsed.length > 0
  ? stats.technologies.mostUsed.slice(0, 5).map(([tech, count], i) => 
      `${i + 1}. **${tech}** (${count} times)`
    ).join('\n')
  : '- No technologies tracked yet'
}

### Weekly Activity Pattern
${stats.patterns.bestDayOfWeek ? `Most active on: **${stats.patterns.bestDayOfWeek}**` : 'Building activity patterns...'}

*Statistics last updated: ${moment().format('MMM DD, YYYY [at] HH:mm UTC')}*
`;

    return content.replace(
      /<!-- STATS_START -->[\s\S]*?<!-- STATS_END -->/,
      `<!-- STATS_START -->\n${statsSection}\n<!-- STATS_END -->`
    );
  }

  updateTimestamp(content) {
    const timestamp = moment().format('MMM DD, YYYY [at] HH:mm UTC');
    return content.replace(
      /\*Last updated: <!-- TIMESTAMP_PLACEHOLDER -->\*/,
      `*Last updated: ${timestamp}*`
    ).replace(
      /\*Last updated: .*\*/,
      `*Last updated: ${timestamp}*`
    );
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new ReadmeUpdater();
  updater.updateReadme().catch(console.error);
}

module.exports = ReadmeUpdater;
