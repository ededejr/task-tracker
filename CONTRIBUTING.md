# Contribution Guide

## Setting up

1. Clone the repo with the following shell command
   `gh repo clone ededejr/task-tracker`

2. Install necessary dependencies
   `cd task-tracker && npm install`

3. You're good to go 🚀

## Conventional Commits

Commits should use the format `<type>(scope): message`. The default preset is using "angular" conventions.

`<type>` must be one of the following:

- build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- ci: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- docs: Documentation only changes
- feat: A new feature
- fix: A bug fix
- perf: A code change that improves performance
- refactor: A code change that neither fixes a bug nor adds a feature
- style: Changes that do not affect the meaning of the code (spacing, formatting, missing semi-colons, etc)
- test: Adding missing tests or correcting existing tests
