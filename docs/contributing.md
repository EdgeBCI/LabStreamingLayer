# Contributing to node-labstreaminglayer

Thank you for your interest in contributing to node-labstreaminglayer! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences
- Accept feedback gracefully

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 7.0.0
- Git
- TypeScript knowledge
- Basic understanding of FFI concepts
- Familiarity with Lab Streaming Layer

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/LabStreamingLayer.git
cd LabStreamingLayer/node-labstreaminglayer
```

3. Add the upstream remote:
```bash
git remote add upstream https://github.com/EdgeBCI/LabStreamingLayer.git
```

## Development Setup

### Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install development tools globally (optional)
npm install -g typescript ts-node
```

### Build the Project

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run build:watch
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- dist/test/util.test.js

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
node-labstreaminglayer/
├── src/                    # TypeScript source files
│   ├── index.ts           # Main exports
│   ├── streamInfo.ts      # StreamInfo class
│   ├── outlet.ts          # StreamOutlet class
│   ├── inlet.ts           # StreamInlet class
│   ├── resolver.ts        # Stream resolution functions
│   ├── util.ts            # Utility functions
│   ├── lib/               # Low-level FFI bindings
│   │   └── index.ts       # FFI definitions
│   ├── examples/          # Example scripts
│   └── test/              # Test files
├── dist/                  # Compiled JavaScript (generated)
├── prebuild/              # Native LSL libraries
├── docs/                  # Documentation
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project README
```

## Development Workflow

### Creating a New Feature

1. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Write the implementation:**
```typescript
// src/yourFeature.ts
export class YourFeature {
  // Implementation
}
```

3. **Add tests:**
```typescript
// src/test/yourFeature.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { YourFeature } from '../yourFeature.js';

describe('YourFeature', () => {
  it('should work correctly', () => {
    const feature = new YourFeature();
    assert.equal(feature.method(), expected);
  });
});
```

4. **Update documentation:**
- Add JSDoc comments to your code
- Update relevant documentation files
- Add examples if applicable

### Making Changes to FFI Bindings

When modifying low-level bindings in `src/lib/index.ts`:

1. **Understand the C API:**
```c
// Check the LSL C header for function signatures
int32_t lsl_push_sample_ftp(lsl_outlet out, const float *data, double timestamp, int32_t pushthrough);
```

2. **Define the FFI binding:**
```typescript
export const lsl_push_sample_f = lib.func(
  'int32 lsl_push_sample_ftp(void* outlet, float* sample, double timestamp, int32 pushthrough)'
);
```

3. **Create high-level wrapper:**
```typescript
pushSample(sample: number[], timestamp?: number, pushthrough: boolean = true) {
  const result = lsl_push_sample_f(this.obj, sample, timestamp || 0.0, pushthrough ? 1 : 0);
  handleError(result);
}
```

## Testing

### Writing Tests

Tests use Node.js built-in test runner:

```typescript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('StreamOutlet', () => {
  let outlet: StreamOutlet;
  
  before(() => {
    const info = new StreamInfo('Test', 'Test', 1, 100, 'float32');
    outlet = new StreamOutlet(info);
  });
  
  after(() => {
    outlet.destroy();
  });
  
  it('should send samples without error', () => {
    assert.doesNotThrow(() => {
      outlet.pushSample([1.0]);
    });
  });
  
  it('should have consumers after inlet connects', async () => {
    const inlet = new StreamInlet(/* ... */);
    const hasConsumers = outlet.waitForConsumers(1.0);
    assert.equal(hasConsumers, true);
  });
});
```

### Testing Guidelines

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test interaction between components
3. **Performance Tests**: Verify performance characteristics
4. **Platform Tests**: Ensure cross-platform compatibility

### Running Platform-Specific Tests

```bash
# Windows
npm run test:windows

# macOS
npm run test:macos

# Linux
npm run test:linux
```

## Code Style

### TypeScript Style Guide

We follow standard TypeScript conventions:

```typescript
// Use PascalCase for classes and types
export class StreamInfo {
  // Private members with underscore prefix (optional)
  private _obj: any;
  
  // Public methods in camelCase
  public getName(): string {
    return lsl_get_name(this._obj);
  }
  
  // Use readonly for immutable properties
  public readonly channelCount: number;
  
  // Use optional parameters with defaults
  public pullSample(timeout: number = FOREVER): [any[], number] {
    // Implementation
  }
}

// Use interfaces for type definitions
export interface StreamOptions {
  chunkSize?: number;
  maxBuffered?: number;
}

// Use enums for constants
export enum ProcessingFlags {
  None = 0,
  ClockSync = 1,
  Dejitter = 2
}
```

### Documentation Style

Use JSDoc comments for all public APIs:

```typescript
/**
 * Creates a new stream outlet for broadcasting data.
 * 
 * @param info - Stream metadata describing the data
 * @param chunkSize - Preferred chunk size for transmission (0 = no chunking)
 * @param maxBuffered - Maximum amount of data to buffer in seconds
 * 
 * @throws {Error} If outlet creation fails
 * 
 * @example
 * ```typescript
 * const info = new StreamInfo('MyStream', 'EEG', 8, 250, 'float32');
 * const outlet = new StreamOutlet(info);
 * outlet.pushSample([1, 2, 3, 4, 5, 6, 7, 8]);
 * ```
 */
constructor(info: StreamInfo, chunkSize: number = 0, maxBuffered: number = 360) {
  // Implementation
}
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format with Prettier
npm run format
```

### Commit Message Format

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
git commit -m "feat(inlet): add support for int64 data type"
git commit -m "fix(resolver): handle timeout correctly in resolveStreams"
git commit -m "docs(readme): update installation instructions"
```

## Submitting Changes

### Pull Request Process

1. **Update your fork:**
```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **Create a feature branch:**
```bash
git checkout -b feature/your-feature
```

3. **Make your changes:**
- Write code
- Add tests
- Update documentation

4. **Run tests locally:**
```bash
npm test
npm run lint
```

5. **Commit your changes:**
```bash
git add .
git commit -m "feat: add new feature"
```

6. **Push to your fork:**
```bash
git push origin feature/your-feature
```

7. **Create a Pull Request:**
- Go to GitHub
- Click "New Pull Request"
- Select your branch
- Fill in the PR template

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added
- [ ] Existing tests updated

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. Automated checks run (tests, linting)
2. Code review by maintainers
3. Address feedback
4. Approval and merge

## Reporting Issues

### Bug Reports

When reporting bugs, include:

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Node.js version: 
- npm version: 
- Operating System: 
- node-labstreaminglayer version: 

## Code Example
```javascript
// Minimal code to reproduce
```

## Error Output
```
Error message and stack trace
```
```

### Feature Requests

For feature requests:

```markdown
## Feature Description
What feature would you like to see?

## Use Case
Why is this feature needed?

## Proposed Solution
How might this be implemented?

## Alternatives Considered
Other approaches you've thought about
```

## Development Tips

### Debugging FFI Issues

```typescript
// Enable debug logging
process.env.DEBUG = 'lsl:*';

// Add debug statements
console.log('FFI call:', functionName, args);
const result = ffiFunction(...args);
console.log('FFI result:', result);
```

### Testing with Multiple LSL Versions

```bash
# Test with different LSL versions
LSL_VERSION=1.14 npm test
LSL_VERSION=1.15 npm test
LSL_VERSION=1.16 npm test
```

### Performance Profiling

```typescript
// Use built-in profiler
console.time('operation');
// ... code to profile ...
console.timeEnd('operation');

// Or use performance API
const start = performance.now();
// ... code to profile ...
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

## Getting Help

If you need help:

1. Check existing documentation
2. Search existing issues
3. Ask in discussions
4. Contact maintainers

## Recognition

Contributors are recognized in:
- The Contributors section of README
- Release notes
- Project documentation

Thank you for contributing to node-labstreaminglayer!