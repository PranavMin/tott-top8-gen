# Top 8 Graphic Generator
[![Netlify Status](https://api.netlify.com/api/v1/badges/41e0ce8e-11b0-4eef-977a-e57b4128308a/deploy-status)](https://app.netlify.com/projects/toolofthetavern/deploys)


This project is a web-based tool designed to generate "Top 8" graphics for esports tournaments, particularly for games like Super Smash Bros. Melee. It allows users to input tournament results, select characters for each player, and then generate a shareable image. Additionally, it includes an experimental image filter section to apply HSL adjustments and background removal to images.

## Live Demo

You can try out the live application here: https://toolofthetavern.netlify.app/

## Features

- Fetch Top 8 standings from start.gg event URLs.
- Editable player names and character selections.
- Character icon preloading for graphic generation.
- Persistent character cache for players.
- Generate high-quality Top 8 graphics with player names, placements, and character icons.
- Copy generated graphics to clipboard.
- Image filter section with HSL adjustments and background removal capabilities.
- Download filtered images.

## Local Development

To set up and run this project on your local machine, follow these steps:

### Prerequisites

Make sure you have Node.js and npm (Node Package Manager) installed.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd tool-of-the-tavern
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

To start the local development server, which includes hot-reloading for a smooth development experience:

```bash
npm run dev
```

This will typically start the application on `http://localhost:5173` (or another available port).

### Environment Variables

This project uses environment variables, managed via a `.env` file, for certain configurations.

1.  Create a file named `.env` in the root directory of the project (where `package.json` is located).
2.  Copy the contents of `.env.example` into your new `.env` file.
3.  Fill in the values as needed. For example, `VITE_STARTGG_KEY` requires a start.gg api key.

    ```
    # Example .env file
    VITE_STARTGG_KEY=s1851kldj81kdskl
    ```

### Building for Production

To create a production-ready build of the application:

```bash
npm run build
```

The optimized static files will be generated in the `dist` directory.

## Project Structure

- `src/top8generatorFE.js`: Main frontend logic for fetching data and generating the Top 8 graphic.
- `src/imagefilterFE.js`: Frontend logic for the HSL image filter section.
- `src/generategraphic.js`: Core logic for drawing the Top 8 graphic on a canvas.
- `src/icon.js`: Handles loading character icons.
- `src/util.js`: Utility functions (e.g., `cleanName`, `extractSlug`).
- `src/index.css`: Styling for the application.
- `index.html`: The main HTML file.
- `vite.config.js`: Vite configuration for the project.
- `netlify.toml`: Configuration for Netlify deployment.