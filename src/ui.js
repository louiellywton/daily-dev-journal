const chalk = require('chalk');

function displayWelcome() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║        Daily Dev Journal              ║
║   Track Your Development Journey      ║
╚═══════════════════════════════════════╝
`));
  
  console.log(chalk.yellow('📚 Welcome to your personal development journal!'));
  console.log(chalk.gray('Track your daily coding progress, mood, and achievements.\n'));
}

function displayStats(stats) {
  console.log(chalk.cyan('\n📊 Development Statistics\n'));
  console.log(chalk.blue('═'.repeat(50)));
  
  // Summary
  console.log(chalk.white('\n📈 Summary:'));
  console.log(`  Days Tracked: ${chalk.green(stats.summary.totalDays)}`);
  console.log(`  Total Entries: ${chalk.green(stats.summary.totalEntries)}`);
  console.log(`  Current Streak: ${chalk.yellow(stats.summary.currentStreak)} days`);
  console.log(`  Longest Streak: ${chalk.yellow(stats.summary.longestStreak)} days`);
  
  // Time Analysis
  console.log(chalk.white('\n⏰ Time Spent Coding:'));
  console.log(`  Total Hours: ${chalk.green(stats.timeSpent.total)}`);
  console.log(`  Daily Average: ${chalk.green(stats.timeSpent.dailyAverage)} hours`);
  console.log(`  Most Productive Day: ${chalk.green(stats.timeSpent.maxSingleDay)} hours`);
  
  // Productivity
  console.log(chalk.white('\n🎯 Productivity:'));
  console.log(`  Average Level: ${chalk.green(stats.productivity.average)}/5`);
  console.log(`  Most Common: ${chalk.green(stats.productivity.mostCommon || 'N/A')}`);
  
  // Technologies
  if (stats.technologies.mostUsed.length > 0) {
    console.log(chalk.white('\n💻 Top Technologies:'));
    stats.technologies.mostUsed.slice(0, 5).forEach(([tech, count], index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`  ${emoji} ${tech}: ${chalk.green(count)} times`);
    });
  }
  
  // Mood Analysis
  if (stats.mood.mostCommon) {
    console.log(chalk.white('\n😊 Mood Analysis:'));
    console.log(`  Most Common Mood: ${chalk.green(stats.mood.mostCommon)}`);
    
    // Show mood distribution
    Object.entries(stats.mood.distribution).forEach(([mood, count]) => {
      const percentage = ((count / stats.summary.totalEntries) * 100).toFixed(1);
      console.log(`    ${mood}: ${count} (${percentage}%)`);
    });
  }
  
  // Patterns
  console.log(chalk.white('\n📅 Patterns:'));
  if (stats.patterns.bestDayOfWeek) {
    console.log(`  Most Active Day: ${chalk.green(stats.patterns.bestDayOfWeek)}`);
  }
  if (stats.patterns.mostActiveHour) {
    const hour = parseInt(stats.patterns.mostActiveHour);
    const timeStr = hour < 12 ? `${hour || 12}:00 AM` : `${hour - 12 || 12}:00 PM`;
    console.log(`  Most Active Hour: ${chalk.green(timeStr)}`);
  }
  
  // Achievements
  if (stats.achievements.length > 0) {
    console.log(chalk.white('\n🏆 Achievements:'));
    stats.achievements.forEach(achievement => {
      console.log(`  ${achievement.title}`);
      console.log(chalk.gray(`    ${achievement.description}`));
    });
  }
  
  console.log(chalk.blue('\n' + '═'.repeat(50)));
  console.log(chalk.gray(`Generated: ${new Date(stats.generatedAt).toLocaleString()}`));
}

function displayProgress(message, current, total) {
  const percentage = Math.round((current / total) * 100);
  const completed = Math.round((current / total) * 20);
  const remaining = 20 - completed;
  
  const progressBar = '█'.repeat(completed) + '░'.repeat(remaining);
  console.log(`${message} [${chalk.green(progressBar)}] ${percentage}% (${current}/${total})`);
}

function displayTable(headers, rows) {
  const columnWidths = headers.map(header => 
    Math.max(header.length, ...rows.map(row => String(row[headers.indexOf(header)] || '').length))
  );
  
  // Header
  const headerRow = headers.map((header, i) => 
    header.padEnd(columnWidths[i])
  ).join(' | ');
  console.log(chalk.blue(headerRow));
  console.log(chalk.blue('-'.repeat(headerRow.length)));
  
  // Rows
  rows.forEach(row => {
    const rowStr = headers.map((header, i) => 
      String(row[i] || '').padEnd(columnWidths[i])
    ).join(' | ');
    console.log(rowStr);
  });
}

module.exports = {
  displayWelcome,
  displayStats,
  displayProgress,
  displayTable
};
