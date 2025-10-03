# Contributing to Mobile Order Tracker

Thank you for your interest in contributing to the Mobile Order Tracker project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept responsibility and apologize for mistakes
- Learn from the experience

### Unacceptable Behavior

- Harassment, discrimination, or abuse
- Trolling, insulting, or derogatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment (see QUICKSTART.md)
4. Create a new branch for your work

```bash
git clone https://github.com/YOUR_USERNAME/MobileOrderTracker.git
cd MobileOrderTracker
git checkout -b feature/your-feature-name
```

### Development Setup

Follow the setup instructions in `QUICKSTART.md` to get your development environment ready.

## Development Workflow

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-photo-upload`)
- `fix/` - Bug fixes (e.g., `fix/qr-scanning-crash`)
- `docs/` - Documentation updates (e.g., `docs/update-api-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/location-service`)
- `test/` - Test additions/updates (e.g., `test/add-unit-tests`)

### Commit Message Convention

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(mobile): add incident photo upload

Implemented photo upload functionality for incident reports using
expo-image-picker. Photos are stored in Supabase storage and URLs
are saved in the incidents table.

Closes #123
```

```
fix(dashboard): resolve real-time update race condition

Fixed issue where rapid status updates could cause UI inconsistency.
Added debouncing to real-time subscription handlers.

Fixes #456
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types from shared/types.ts

```typescript
// Good
interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

// Avoid
const order: any = {...};
```

### React/React Native

- Use functional components with hooks
- Follow React best practices
- Implement proper error boundaries
- Use meaningful component names

```typescript
// Good
const OrderDetailsScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  // ...
};

// Avoid
function Screen() {
  var loading = false;
  // ...
}
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas
- Use semicolons
- Run linter before committing

```typescript
// Good
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};

// Avoid
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};
```

### File Organization

```
component-name/
  ├── ComponentName.tsx
  ├── ComponentName.test.tsx
  ├── ComponentName.styles.ts
  └── index.ts
```

### Naming Conventions

- **Components**: PascalCase (e.g., `OrderDetailsScreen`)
- **Files**: PascalCase for components, camelCase for utilities
- **Variables/Functions**: camelCase (e.g., `getUserOrders`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_TIMEOUT`)
- **Types/Interfaces**: PascalCase (e.g., `OrderStatus`)

## Testing Guidelines

### Unit Tests

Write unit tests for:

- Utility functions
- Business logic
- Data transformations
- Edge cases

```typescript
describe("calculateDistance", () => {
  it("should calculate distance between two points", () => {
    const point1 = { latitude: 40.7128, longitude: -74.006 };
    const point2 = { latitude: 40.7589, longitude: -73.9851 };

    const distance = calculateDistance(point1, point2);

    expect(distance).toBeCloseTo(5.6, 1);
  });
});
```

### Integration Tests

Test integration between:

- API calls and UI
- Database operations
- External services

### E2E Tests

Test critical user flows:

- QR code scanning
- Order creation
- Location tracking
- Status updates

### Running Tests

```bash
# Mobile app
cd mobile-app
npm test

# Dashboard
cd dashboard
npm test

# Watch mode
npm test -- --watch
```

## Pull Request Process

### Before Submitting

1. **Update your branch**

   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run tests**

   ```bash
   npm test
   ```

3. **Run linter**

   ```bash
   npm run lint
   ```

4. **Build successfully**

   ```bash
   npm run build
   ```

5. **Update documentation** if needed

### PR Title Format

Use conventional commit format:

```
feat(mobile): add offline support for location tracking
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

Add screenshots here

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally

## Related Issues

Closes #123
```

### Review Process

1. Submit PR with clear description
2. Wait for automated checks to pass
3. Address review feedback
4. Get approval from maintainers
5. PR will be merged

## Bug Reports

### Before Reporting

1. Check existing issues
2. Try latest version
3. Gather reproduction steps

### Bug Report Template

```markdown
**Describe the Bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:

1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Screenshots**
Add screenshots if applicable

**Environment:**

- OS: [e.g., iOS 16, Android 13]
- App Version: [e.g., 1.0.0]
- Device: [e.g., iPhone 14, Samsung Galaxy S23]

**Additional Context**
Any other relevant information
```

## Feature Requests

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature

**Problem It Solves**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Screenshots, mockups, or examples
```

## Code Review Guidelines

### For Reviewers

- Be constructive and respectful
- Focus on code, not the person
- Ask questions instead of making demands
- Explain the "why" behind suggestions
- Approve if minor changes needed
- Request changes for major issues

### For Authors

- Don't take feedback personally
- Respond to all comments
- Ask for clarification if needed
- Thank reviewers for their time
- Learn from the feedback

## Documentation

### Update Documentation When:

- Adding new features
- Changing APIs
- Modifying setup process
- Updating dependencies
- Changing architecture

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add screenshots where helpful
- Keep it up to date
- Test all instructions

## Getting Help

### Resources

- Read the documentation in `/docs`
- Check existing issues and PRs
- Review code comments
- Ask in discussions

### Contact

For questions or help:

- Open a discussion
- Comment on relevant issues
- Reach out to maintainers

## Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to Mobile Order Tracker! 🚀
