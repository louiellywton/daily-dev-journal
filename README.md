# Daily Dev Journal

A comprehensive daily development journal and productivity tracker designed for modern developers. Built with Node.js, this tool provides intelligent analytics, automated insights, and professional reporting capabilities to help developers track their coding journey, analyze productivity patterns, and achieve their learning goals.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](https://github.com/features/actions)

## Key Features

### Core Functionality
- **Daily Journaling**: Log coding activities with mood, productivity, and technology tracking
- **Goal Management**: Set, track, and complete learning objectives with milestone tracking
- **Advanced Analytics**: Generate comprehensive statistics with caching and performance optimization
- **Technology Analysis**: Monitor technology usage patterns and learning diversity
- **Streak Tracking**: Maintain coding consistency with intelligent streak quality assessment

### Automation & Reporting
- **Automated Daily Updates**: Smart data processing with synthetic entry generation
- **Multi-format Export**: Export data to JSON, CSV, and Markdown formats
- **Weekly & Monthly Reports**: Comprehensive progress summaries with trend analysis
- **CI/CD Integration**: GitHub Actions for automated maintenance and updates

### Professional Features
- **Data Validation**: Robust error handling and data integrity checks
- **Performance Optimization**: Intelligent caching system with 5-minute TTL
- **Timezone Support**: User preferences and localization capabilities
- **Version Management**: Structured data formats with migration support

## Current Statistics

<!-- STATS_START -->

| Metric | Value |
|--------|-------|
| **Days Tracked** | 2 days |
| **Total Entries** | 2 entries |
| **Current Streak** | 1 days |
| **Longest Streak** | 1 days |
| **Total Hours** | 8h |
| **Avg Productivity** | 3.00/5.0 |
| **Technologies Used** | 4 different |
| **Achievements** | 0 earned |
| **Journey Started** | Aug 27, 2025 (1 days ago) |

### Recent Achievements
- No achievements yet - keep coding!

### Top Technologies (Last 30 Days)
1. **ruby** (1 times)
2. **Java** (1 times)
3. **Go** (1 times)
4. **TypeScript** (1 times)

### Weekly Activity Pattern
Most active on: **Thursday**

*Statistics last updated: Aug 28, 2025 at 05:06 UTC*

<!-- STATS_END -->

## Installation

### Option 1: Install from npm (Recommended)

```bash
# Install globally
npm install -g daily-dev-journal

# Use the CLI commands directly
daily-journal --help
# or use the short alias
ddj --help
```

### Option 2: Install from Source

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

## Usage Guide

### Quick Start
```bash
# Interactive journal session (recommended for first-time users)
node src/index.js interactive

# View help and all available commands
node src/index.js --help
```

### Journal Management
```bash
# Create a detailed journal entry
node src/index.js entry -m "Implemented user authentication system" -t "feature"

# Quick entry for bug fixes
node src/index.js entry -m "Fixed memory leak in data processing" -t "bug-fix"

# Learning-focused entry
node src/index.js entry -m "Studied advanced React patterns" -t "learning"
```

### Analytics & Statistics
```bash
# View comprehensive 30-day statistics
node src/index.js stats

# Weekly analysis
node src/index.js stats -d 7

# Quarterly review
node src/index.js stats -d 90
```

### Goal Management System
```bash
# Add specific learning goals
node src/index.js goals -a "Master React performance optimization techniques"
node src/index.js goals -a "Complete Node.js certification course"

# List all goals with status
node src/index.js goals -l

# Mark goal as completed (use ID from list)
node src/index.js goals -c 1629123456789
```

### Data Export Features
```bash
# Export all data to JSON format
node src/index.js export -f json

# Export last 90 days to CSV for analysis
node src/index.js export -f csv -d 90

# Generate Markdown report for documentation
node src/index.js export -f md -d 30

# Export without analytics (data only)
node src/index.js export -f json --no-analytics
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

*Last updated: Aug 28, 2025 at 05:06 UTC*
