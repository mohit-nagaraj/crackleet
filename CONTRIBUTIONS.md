# Contributing to CrackLeet

Thank you for your interest in contributing to CrackLeet! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate when contributing to this project. We aim to maintain a welcoming and inclusive community.

## How to Contribute

### Reporting Bugs

If you find a bug in CrackLeet:

1. Check the [GitHub Issues](https://github.com/mohit-nagaraj/crackleet/issues) to see if it has already been reported
2. If not, create a new issue with:
   - A clear, descriptive title
   - Detailed steps to reproduce the bug
   - Information about your environment (OS, application version, etc.)
   - Screenshots if applicable

### Suggesting Features

We welcome feature suggestions! To propose a new feature:

1. Check existing issues to see if your feature has been suggested
2. Create a new issue with:
   - A clear title that starts with "Feature Request:"
   - A detailed description of the feature and why it would be valuable
   - Any mockups or examples if applicable

### Pull Requests

We actively welcome pull requests:

1. Fork the repository and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Update the documentation as needed
4. Ensure the test suite passes (if applicable)
5. Make sure your code follows our coding conventions
6. Submit a pull request

## Development Environment Setup

Follow the instructions in [SETUP.md](SETUP.md) to set up your development environment.

## Project Structure

```
crackleet/
├── electron-app/       # Electron application code
│   ├── main.js         # Main Electron process
│   ├── renderer.js     # Renderer process
│   ├── preload.js      # Preload script
│   ├── index.html      # Main HTML file
│   ├── style.css       # Styling
│   └── gemini-api.js   # Gemini API integration
└── qt-injector/        # Qt C++ overlay component
    ├── src/            # C++ source files
    ├── include/        # Header files
    └── main.cpp        # Main logic file for hacking
    └── ...             # Other Qt project files
```

## Coding Standards

### JavaScript/Electron
- Use ES6+ features when appropriate
- Follow standard JavaScript conventions
- Document complex functions with JSDoc comments

### C++/Qt
- Follow Qt coding standards
- Use descriptive variable and function names
- Comment complex sections of code

### General
- Write clear, concise commit messages
- Keep code modular and reusable
- Optimize for readability

## Testing

- Test your changes thoroughly before submitting a pull request
- Include tests for new features when possible
- Ensure all existing tests pass

## Documentation

- Update documentation when changing functionality
- Document new features
- Use clear and concise language

## Release Process

Our release process follows these general steps:
1. Code is merged into the main branch
2. Tests are run and passed
3. A release version is tagged
4. Builds are created for all supported platforms
5. Release notes are written and published
6. Release is published on GitHub

## Need Help?

If you have questions or need help with your contribution:
- Create an issue tagged with "question"
- Reach out to the maintainers

Thank you for contributing to CrackLeet!