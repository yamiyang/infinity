import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import http from "http";

let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;
const NEXT_PORT = 3099;
const NEXT_URL = `http://localhost:${NEXT_PORT}`;

// Config file path in user data directory
const CONFIG_PATH = path.join(app.getPath("userData"), "infinity-config.json");

// Are we in dev mode? (not packaged, running from source)
const isDev = !app.isPackaged;

function getShellPath(): string {
  if (isDev) {
    // In dev, shell.html is in electron/ directory (sibling of dist-electron/)
    return path.join(__dirname, "..", "electron", "shell.html");
  }
  // In packaged app, shell.html is copied alongside dist-electron
  return path.join(__dirname, "shell.html");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 12 },
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    backgroundColor: "#ffffff",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Load the tab manager shell
  const shellPath = getShellPath();
  console.log("[electron] Loading shell from:", shellPath);
  mainWindow.loadFile(shellPath);

  if (isDev) {
    // Open devtools in dev mode for debugging
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/** Wait for Next.js dev server to be ready by polling */
function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      const req = http.get(url, (res) => {
        // Any response means server is up
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server at ${url} not ready after ${timeoutMs}ms`));
        } else {
          setTimeout(check, 500);
        }
      });
      req.end();
    }

    check();
  });
}

async function startNextServer(): Promise<void> {
  if (isDev) {
    // In dev mode, Next.js should already be running externally
    // or we start it ourselves
    console.log("[electron] Dev mode — checking if Next.js is already running...");

    try {
      await waitForServer(NEXT_URL, 3000);
      console.log("[electron] Next.js already running at", NEXT_URL);
      return;
    } catch {
      console.log("[electron] Next.js not running, starting it...");
    }

    // Start next dev
    const nextDir = path.join(__dirname, "..");
    const nextBin = path.join(nextDir, "node_modules", ".bin", "next");

    nextProcess = spawn(nextBin, ["dev", "--port", String(NEXT_PORT)], {
      cwd: nextDir,
      env: {
        ...process.env,
        BUILD_TARGET: "electron",
        INFINITY_CONFIG_PATH: CONFIG_PATH,
        PORT: String(NEXT_PORT),
        NODE_ENV: "development",
      },
      stdio: "pipe",
      shell: true,
    });

    nextProcess.stdout?.on("data", (data: Buffer) => {
      console.log("[next]", data.toString().trim());
    });

    nextProcess.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.error("[next:err]", msg);
    });

    nextProcess.on("error", (err) => {
      console.error("Failed to start Next.js:", err);
    });

    nextProcess.on("exit", (code) => {
      console.log("Next.js exited with code", code);
      nextProcess = null;
    });

    // Wait for it to be ready
    console.log("[electron] Waiting for Next.js to start...");
    await waitForServer(NEXT_URL, 30000);
    console.log("[electron] Next.js ready!");
    return;
  }

  // Production: start from built output
  return new Promise((resolve, reject) => {
    const nextDir = app.isPackaged
      ? path.join(process.resourcesPath, "app")
      : path.join(__dirname, "..");

    const env = {
      ...process.env,
      BUILD_TARGET: "electron",
      INFINITY_CONFIG_PATH: CONFIG_PATH,
      PORT: String(NEXT_PORT),
      NODE_ENV: "production",
    };

    // Try standalone server first, fall back to next start
    const serverPath = path.join(nextDir, ".next", "standalone", "server.js");
    const nextBin = path.join(nextDir, "node_modules", ".bin", "next");

    try {
      const fs = require("fs");
      if (fs.existsSync(serverPath)) {
        nextProcess = spawn(process.execPath, [serverPath], {
          cwd: nextDir,
          env,
          stdio: "pipe",
        });
      } else {
        nextProcess = spawn(nextBin, ["start", "--port", String(NEXT_PORT)], {
          cwd: nextDir,
          env,
          stdio: "pipe",
          shell: true,
        });
      }
    } catch {
      nextProcess = spawn(nextBin, ["start", "--port", String(NEXT_PORT)], {
        cwd: nextDir,
        env,
        stdio: "pipe",
        shell: true,
      });
    }

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 15000);

    nextProcess.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      console.log("[next]", msg.trim());
      if (!started && (msg.includes("Ready") || msg.includes("started") || msg.includes(String(NEXT_PORT)))) {
        started = true;
        clearTimeout(timeout);
        setTimeout(resolve, 500);
      }
    });

    nextProcess.stderr?.on("data", (data: Buffer) => {
      console.error("[next:err]", data.toString().trim());
    });

    nextProcess.on("error", (err) => {
      console.error("Failed to start Next.js:", err);
      if (!started) {
        started = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    nextProcess.on("exit", (code) => {
      console.log("Next.js exited with code", code);
      nextProcess = null;
    });
  });
}

// IPC handlers for tab management
ipcMain.handle("get-next-url", () => NEXT_URL);
ipcMain.handle("get-config-path", () => CONFIG_PATH);

// Window controls
ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window-close", () => mainWindow?.close());
ipcMain.handle("window-is-maximized", () => mainWindow?.isMaximized() ?? false);

app.whenReady().then(async () => {
  try {
    await startNextServer();
  } catch (err) {
    console.error("Failed to start Next.js server:", err);
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
    nextProcess = null;
  }
});
