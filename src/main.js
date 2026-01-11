import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import fs from "node:fs/promises";
import fetch from "node-fetch"; // or global fetch if available
import dotenv from "dotenv";

// load .env for main process (so process.env.VITE_STARTGG_KEY is available)
dotenv.config();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.handle("fetch-top8", async (_, slug) => {
  const apiKey = process.env.VITE_STARTGG_KEY;
  if (!apiKey) throw new Error("API key not set in main process");
  const query = `query EventStandings($slug: String) {
        event(slug: $slug) {
            standings(query: { perPage: 8, page: 1 }) {
                nodes {
                    placement
                    entrant { name }
                }
            }
        }
    }`;
  const res = await fetch("https://api.start.gg/gql/alpha", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables: { slug } }),
  });
  const json = await res.json();
  return json.data?.event?.standings?.nodes ?? [];
});

ipcMain.handle("save-png", async (_, dataUrl) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: "PNG", extensions: ["png"] }],
    defaultPath: "top8.png",
  });
  if (canceled || !filePath) return { canceled: true };
  const base64 = dataUrl.split(",")[1];
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  return { canceled: false, path: filePath };
});

// Add simple persistent cache (player name -> character) stored in the user's app data
ipcMain.handle("read-cache", async () => {
  try {
    const cachePath = path.join(app.getPath("userData"), "character-cache.json");
    const data = await fs.readFile(cachePath, "utf8").catch(() => null);
    if (!data) return {};
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read cache:", err);
    return {};
  }
});

ipcMain.handle("write-cache", async (_, newMap) => {
  try {
    const cachePath = path.join(app.getPath("userData"), "character-cache.json");
    // read existing cache and merge
    const existingData = await fs.readFile(cachePath, "utf8").catch(() => null);
    const existing = existingData ? JSON.parse(existingData) : {};
    const merged = Object.assign({}, existing, newMap || {});
    await fs.writeFile(cachePath, JSON.stringify(merged, null, 2), "utf8");
    return { ok: true };
  } catch (err) {
    console.error("Failed to write cache:", err);
    return { ok: false, error: String(err) };
  }
});
