# Silksong Tracker

**[View the Silksong Tracker](https://th3r3dfox.github.io/silksong-tracker/).**

**Silksong Tracker** is a web-based tool that allows you to analyze and visualize your [_Hollow Knight: Silksong_](https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/) save files. It helps players explore their progress, bosses defeated, items collected, and hidden secrets.

All data is processed **locally in your browser** - your save file is never uploaded or stored.

## Features

- Upload and decode Silksong `.dat` save files
- View progress for bosses, items, and upgrades
- Toggle **spoiler** and **missing only** filters
- All decoding and rendering happens client-side
- Compatible with modern browsers (Chrome, Firefox, Edge)

## How to Use

1. Go to [the website for the tracker](https://th3r3dfox.github.io/silksong-tracker/).
2. Click on the "Upload save" button in the top-right-hand corner.
3. Click on the box that says "click to browser".
4. Select your save file.
5. The tracker will decode the save and display the progress by category.

## Technical Overview

You can read a [technical overview](docs/overview.md) of the project on a separate page.

## Development / Contributing

This project is written in [TypeScript](https://www.typescriptlang.org/) and uses [Vite](https://vite.dev/) to bundle all of the code.

### Getting Started

- Install [Git](https://git-scm.com/), if you do not already have it installed.
- Install [Visual Studio Code](https://code.visualstudio.com/), if you do not already have it installed. (We recommend using Visual Studio Code, but feel free to use a different editor if you know what you are doing.)
- Install [Node.js](https://nodejs.org/en), if you do not already have it installed.
- Create a GitHub account and login, if you have not already.
- [Fork](https://github.com/th3r3dfox/silksong-tracker/fork) this repository.
- [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) your fork.
- Open a new shell/termainal and `cd` to the cloned repository directory.
- Install the JavaScript/TypeScript dependencies:
  - `npm ci`
- Start a local version of the website on your computer:
  - `npm run start`

### Formatting & Linting

This project uses [Prettier](https://prettier.io/), an automatic code formatter, and [ESLint](https://eslint.org/), a code linter. We have a ".vscode/settings.json" file that tells Visual Studio Code to automatically format a file on save. For this to work properly, you have to:

1. Open Visual Studio Code to the repository folder. (File --> Open Folder)
2. Ensure that you have already installed the JavaScript/TypeScript dependencies with: `npm ci`
3. Install [the Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) for Visual Studio Code.
4. Install [the ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for Visual Studio Code.

Before submitting [a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests), please make sure that your updated coded passes our lint checks:

```sh
npm run lint
```

## Credits

Inspired by [ReznorMichael's](https://github.com/ReznoRMichael) [Hollow Knight Save Analyzer](https://reznormichael.github.io/hollow-knight-completion-check/).

## Legal

This is a non-commercial fan project. We are not affiliated with [Team Cherry](https://www.teamcherry.com.au/).
