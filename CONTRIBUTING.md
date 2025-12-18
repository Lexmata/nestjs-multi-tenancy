# Contributing to @lexmata/nestjs-multi-tenant

Thank you for your interest in contributing to the NestJS Multi-Tenant module! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be considerate and constructive in your communications.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your changes
5. Make your changes and commit them
6. Push to your fork and submit a pull request

## Development Setup

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: 10.x (specified in `packageManager` field)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nestjs-multi-tenancy.git
cd nestjs-multi-tenancy

# Install dependencies
pnpm install

# Run tests to verify setup
pnpm test
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm dev` | Watch mode for development |
| `pnpm test` | Run test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Check for linting errors |
| `pnpm lint:fix` | Fix auto-fixable linting errors |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |

## Project Structure

```
nestjs-multi-tenant/
├── src/
│   ├── constants.ts          # Module constants and tokens
│   ├── decorators/           # Parameter and method decorators
│   ├── guards/               # Route guards
│   ├── interfaces/           # TypeScript interfaces
│   ├── middleware/           # Tenant extraction middleware
│   ├── services/             # Core services
│   ├── multi-tenant.module.ts
│   └── index.ts              # Public API exports
├── docs/                     # Documentation website (Angular)
├── .github/                  # GitHub workflows and templates
└── dist/                     # Compiled output (generated)
```

## Making Changes

### Branch Naming

Create a descriptive branch name:

- `feat/add-jwt-strategy` - New features
- `fix/header-extraction-bug` - Bug fixes
- `docs/update-readme` - Documentation changes
- `refactor/simplify-middleware` - Code refactoring
- `test/add-guard-tests` - Test additions

### Workflow

1. Ensure you're on the `develop` branch and it's up to date:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. Create your feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. Make your changes with clear, focused commits

4. Push to your fork and create a pull request against `develop`

## Commit Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commit messages are validated by commitlint.

### Commit Message Format

```
<type>: <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code refactoring (no feature or bug changes) |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI/CD configuration changes |
| `chore` | Other changes (tooling, configs, etc.) |

### Rules

- **Subject must be lowercase** - `feat: add new strategy` ✅ not `feat: Add new strategy` ❌
- Keep the subject line under 72 characters
- Use the imperative mood: "add feature" not "added feature"
- Don't end the subject with a period

### Examples

```bash
# Good commits
feat: add cookie-based tenant extraction strategy
fix: handle undefined tenant header gracefully
docs: update installation instructions
test: add unit tests for tenant guard
refactor: simplify middleware registration logic

# Bad commits
feat: Added new feature.     # Past tense, period, capitalized
fix stuff                    # No type, vague message
updated tests                # No type
```

## Code Style

This project uses ESLint and Prettier for code quality and formatting.

### ESLint

The project uses a comprehensive ESLint configuration with plugins for:
- TypeScript best practices
- Import organization
- Security checks
- Code quality (SonarJS, Unicorn)

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Prettier

Code formatting is handled by Prettier:

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check
```

### Pre-commit Hooks

Husky and lint-staged automatically run linting and formatting on staged files before each commit. This ensures consistent code quality.

## Testing

All changes should include appropriate tests. We use [Vitest](https://vitest.dev/) as our test framework.

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Test Guidelines

- Write tests for new features and bug fixes
- Maintain or improve code coverage
- Use descriptive test names that explain the expected behavior
- Follow the existing test patterns in the codebase

### Test Structure

```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Pull Request Process

1. **Ensure all checks pass**: Tests, linting, and formatting must pass
2. **Update documentation**: If your change affects the public API, update the README
3. **Add changelog entry**: For significant changes, add an entry to `CHANGELOG.md` under `[Unreleased]`
4. **Request review**: Tag maintainers for review
5. **Address feedback**: Make requested changes in new commits
6. **Squash if needed**: Keep commit history clean

### PR Title Format

Follow the same format as commit messages:

```
feat: add support for custom tenant validators
fix: resolve memory leak in context service
docs: improve configuration examples
```

### PR Description Template

When creating a PR, please include:

- **What**: Brief description of changes
- **Why**: Motivation for the change
- **How**: Implementation approach (if complex)
- **Testing**: How the changes were tested
- **Screenshots**: If applicable (for docs changes)

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Reproduction**: Steps to reproduce the behavior
3. **Expected behavior**: What you expected to happen
4. **Actual behavior**: What actually happened
5. **Environment**:
   - Node.js version
   - NestJS version
   - Package version
   - OS

### Feature Requests

For feature requests, please include:

1. **Use case**: Describe the problem you're trying to solve
2. **Proposed solution**: Your suggested approach
3. **Alternatives**: Any alternatives you've considered
4. **Additional context**: Any other relevant information

---

## Questions?

If you have questions about contributing, feel free to:

- Open a [GitHub Discussion](https://github.com/Lexmata/nestjs-multi-tenancy/discussions)
- Create an issue with the `question` label

Thank you for contributing! 🎉


