# Silksong Tracker

**[View the Silksong Tracker](https://th3r3dfox.github.io/silksong-tracker/).**

**Silksong Tracker** is a web-based tool that allows you to analyze and visualize your [_Hollow Knight: Silksong_](https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/) save files. It helps players explore their progress, bosses defeated, items collected, and hidden secrets.

All data is processed **locally in your browser** — your save file is never uploaded or stored.

## Features

- Upload and decode Silksong `.dat` save files
- View progress for bosses, items, and upgrades
- Toggle **spoiler** and **missing only** filters
- All decoding and rendering happens client-side
- Compatible with modern browsers (Chrome, Firefox, Edge)

## How to Use

1. Go to the hosted tracker (if deployed) or open `index.html` locally.
2. Click **Upload Save** or drag your `.dat` file (e.g., `user1.dat`) into the drop area.
3. The tracker will decode the save and display progress by category.

## Technical Details

A full explanation of the project architecture, decoding logic, and data model is available here: [docs/TECHNICAL_DOCUMENTATION.md](./docs/TECHNICAL_DOCUMENTATION.md)

## Contributing

This project uses [Prettier](https://prettier.io/), an automatic code formatter. First, install [Node.js](https://nodejs.org/en) (if you do not already have it installed). Then, you can run Prettier like this:

```sh
cd silksong-tracker
npm ci # To install the JavaScript dependencies.
npm lint # To check to see if the codebase is correctly formatted.
npm format # To automatically format the codebase.
```

## Credits

Inspired by [ReznorMichael's](https://github.com/ReznoRMichael) [Hollow Knight Save Analyzer](https://reznormichael.github.io/hollow-knight-completion-check/).

## Legal

This is a non-commercial fan project not affiliated with Team Cherry.
