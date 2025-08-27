# Daily Dev Journal

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

| Metric | Value |
|--------|-------|
| **Days Tracked** | 0 days |
| **Total Entries** | 0 entries |
| **Current Streak** | 0 days |
| **Longest Streak** | 0 days |
| **Total Hours** | 0h |
| **Avg Productivity** | 0/5.0 |
| **Technologies Used** | 0 different |
| **Achievements** | 0 earned |
| **Journey Started** | Getting started... |

### Recent Achievements
- No achievements yet - keep coding!

### Top Technologies (Last 30 Days)
- No technologies tracked yet

### Weekly Activity Pattern
Building activity patterns...

*Statistics last updated: Getting started*

<!-- STATS_END -->

## Installation

```bash
# Clone the repository
git clone https://github.com/louiellywton/daily-dev-journal.git

# Navigate to project directory
cd daily-dev-journal

# Install dependencies
npm install

# Start using the journal
npm start
```

## Usage

### Create a Journal Entry
```bash
# Interactive entry
node src/index.js entry

# Quick entry with message
node src/index.js entry -m "Worked on React components" -t "feature"
```

### View Statistics
```bash
# View 30-day statistics
node src/index.js stats

# View custom period
node src/index.js stats -d 7
```

### Manage Goals
```bash
# Add a goal
node src/index.js goals -a "Learn TypeScript"

# List all goals
node src/index.js goals -l

# Complete a goal
node src/index.js goals -c GOAL_ID
```

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

```
data/
├── entries/           # Daily journal entries
├── goals.json         # Learning goals and progress
├── config.json        # User configuration and stats
├── reports/           # Generated reports and analytics
├── daily-insights/    # AI-generated daily insights
└── logs/             # System logs and maintenance
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests, create issues, or suggest new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for developers who want to track and improve their coding journey
- Inspired by the power of consistent daily practice and reflection
- Designed to help build better development habits

---

*Last updated: Project initialization*
