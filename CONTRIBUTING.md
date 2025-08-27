# Contributing to Daily Dev Journal 🤝

Thank you for considering contributing to Daily Dev Journal! This project aims to help developers track their progress and build better coding habits.

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Contributions](#making-contributions)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful, inclusive, and constructive in all interactions.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/louiellywton/daily-dev-journal.git
   cd daily-dev-journal
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/louiellywton/daily-dev-journal.git
   ```

## 🛠️ Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the application**:
   ```bash
   npm start
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Check linting**:
   ```bash
   npm run lint
   ```

## 🔧 Making Contributions

### 🐛 Bug Reports

When filing a bug report, please include:

- **Clear description** of the issue
- **Steps to reproduce** the bug
- **Expected vs actual behavior**
- **Environment information** (OS, Node.js version, etc.)
- **Screenshots** if applicable

### ✨ Feature Requests

For feature requests, please provide:

- **Clear description** of the proposed feature
- **Use case** and motivation
- **Possible implementation approach**
- **Any relevant examples** or mockups

### 💻 Code Contributions

1. **Create a branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following our style guidelines

3. **Add tests** for new functionality

4. **Update documentation** if necessary

5. **Commit your changes** with descriptive messages:
   ```bash
   git commit -m "feat: add daily mood tracking feature"
   # or
   git commit -m "fix: resolve streak calculation bug"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## 📝 Style Guidelines

### JavaScript Style

- Use **ES6+ features** where appropriate
- Follow **camelCase** naming convention
- Use **const** for constants, **let** for variables
- Include **JSDoc comments** for functions and classes
- Keep functions **focused and small**

Example:
```javascript
/**
 * Calculates the current coding streak
 * @param {Array} entries - Array of journal entries
 * @returns {number} Current streak in days
 */
function calculateStreak(entries) {
  // Implementation here
}
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` code style changes (formatting, etc.)
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks

Examples:
```
feat: add weekly progress reports
fix: correct productivity calculation
docs: update API documentation
test: add unit tests for analytics module
```

### File Structure

```
src/
├── index.js          # Main application entry
├── journal.js        # Core journal functionality
├── analytics.js      # Analytics and statistics
├── ui.js            # User interface utilities
└── utils/           # Utility functions

scripts/
├── daily-update.js   # Daily automation script
├── generate-report.js # Report generation
└── update-readme-stats.js # README statistics updater

data/
├── entries/         # Daily journal entries
├── reports/         # Generated reports
└── logs/           # Application logs
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

- Place tests in `tests/` directory
- Use descriptive test names
- Test both happy paths and error cases
- Mock external dependencies

Example:
```javascript
describe('Analytics', () => {
  it('should calculate correct productivity average', () => {
    const analytics = new Analytics();
    const entries = [/* test data */];
    const result = analytics.calculateProductivity(entries);
    expect(result.average).toBe(3.5);
  });
});
```

## 📚 Documentation

### Code Documentation

- Use **JSDoc** comments for all public functions
- Include **parameter types** and **return values**
- Provide **usage examples** where helpful

### README Updates

When adding features:
- Update the **Features** section
- Add **usage examples**
- Update **installation instructions** if needed

### API Documentation

Document any new APIs or significant changes in the `docs/` directory.

## 🎯 Areas for Contribution

We welcome contributions in these areas:

### 🔧 Features
- New analytics and insights
- Additional export formats
- Integration with external services
- Mobile/web interface
- Data visualization improvements

### 🐛 Bug Fixes
- Calculation errors in analytics
- Performance optimizations
- Cross-platform compatibility
- Error handling improvements

### 📝 Documentation
- Code comments and documentation
- Tutorial and how-to guides
- API documentation
- Translation to other languages

### 🧪 Testing
- Unit test coverage
- Integration tests
- Performance testing
- Cross-platform testing

## 💡 Development Tips

### Project Structure Understanding

- `src/` contains the core application logic
- `scripts/` contains automation and utility scripts
- `data/` stores user data and generated reports
- `.github/workflows/` contains GitHub Actions for automation

### Debugging

- Use `console.log()` for quick debugging
- The application creates log files in `data/logs/`
- Use Node.js debugger for complex issues

### Working with Data

- All data is stored in JSON format
- Ensure backward compatibility when changing data structures
- Test with various data sizes and edge cases

## ❓ Getting Help

If you need help or have questions:

1. Check existing **GitHub Issues**
2. Review the **documentation**
3. Create a new **GitHub Issue** with the `question` label
4. Join our community discussions

## 🙏 Recognition

All contributors will be recognized in our README and release notes. Thank you for helping make Daily Dev Journal better!

---

Happy coding! 🚀
