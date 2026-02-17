const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const https = require("https");
const fs = require("fs/promises");

function hasKillSwitchBypassArg() {
    return process.argv.some(a => String(a).toLowerCase() === "-ks-false");
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: "GET",
            headers: { "User-Agent": "ExtractorPdf" }
        }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
        });
        req.on("error", reject);
        req.end();
    });
}

async function enforceKillSwitchOrQuit() {
    // bypass
    if (hasKillSwitchBypassArg()) return true;

    // file “sentinella” su GitHub (RAW)
    const url = "https://raw.githubusercontent.com/Trorker/ExtractorPdf/main/killswitch/ALLOW";

    try {
        const r = await httpsGet(url);

        // esiste -> OK
        if (r.status === 200) return true;

        // non esiste -> blocca
        const result = await dialog.showMessageBox({
            type: "warning",
            title: "Applicazione disabilitata",
            message: "Questa applicazione è stata disabilitata. Contatta lo sviluppatore.",
            detail: "Apri la pagina GitHub per maggiori informazioni.",
            buttons: ["Apri GitHub", "Chiudi"],
            defaultId: 0,
            cancelId: 1
        });

        if (result.response === 0) {
            await shell.openExternal("https://github.com/Trorker/ExtractorPdf");
        }

        return false;
    } catch (e) {
        // errore rete: per come lo vuoi tu, blocchiamo comunque
        const result = await dialog.showMessageBox({
            type: "error",
            title: "Verifica licenza non riuscita",
            message: "Impossibile verificare l'autorizzazione all'avvio.",
            detail: "Contatta lo sviluppatore o riprova quando hai connessione. (Puoi avviare con -ks-false se autorizzato)",
            buttons: ["Apri GitHub", "Chiudi"],
            defaultId: 0,
            cancelId: 1
        });

        if (result.response === 0) {
            await shell.openExternal("https://github.com/Trorker/ExtractorPdf");
        }
        return false;
    }
}


function createWindow() {
    const preloadPath = path.join(__dirname, "preload.js");
    console.log("Preload path:", preloadPath);

    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        icon: path.join(__dirname, "build", "icon.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: false   // 👈 BLOCCA DevTools
        }
    });

    win.loadFile(path.join(__dirname, "renderer", "index.html"));

    win.webContents.on("before-input-event", (event, input) => {
        if (input.key === "F12") {
            event.preventDefault();
        }

        if (input.control && input.shift && input.key.toLowerCase() === "i") {
            event.preventDefault();
        }
    });

    //win.webContents.openDevTools(); // se vuoi

}


app.whenReady().then(async () => {
    const ok = await enforceKillSwitchOrQuit();
    if (!ok) {
        app.quit();
        return;
    }

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});


app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// ===== IPC =====

ipcMain.handle("pick-pdf-files", async () => {
    const res = await dialog.showOpenDialog({
        title: "Seleziona PDF",
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (res.canceled) return [];
    return res.filePaths;
});

ipcMain.handle("read-file", async (_evt, filePath) => {
    const buf = await fs.readFile(filePath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});

ipcMain.handle("save-bytes", async (_evt, { defaultName, bytes }) => {
    const res = await dialog.showSaveDialog({
        title: "Salva file",
        defaultPath: defaultName,
        filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (res.canceled || !res.filePath) return { saved: false };

    //await fs.writeFile(res.filePath, Buffer.from(bytes));
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(new Uint8Array(bytes));
    await fs.writeFile(res.filePath, buf);

    return { saved: true, path: res.filePath };
});

ipcMain.handle("save-text", async (_evt, { defaultName, text }) => {
    const res = await dialog.showSaveDialog({
        title: "Salva file",
        defaultPath: defaultName,
        filters: [{ name: "CSV", extensions: ["csv"] }, { name: "Text", extensions: ["txt"] }]
    });
    if (res.canceled || !res.filePath) return { saved: false };

    await fs.writeFile(res.filePath, text, "utf8");
    return { saved: true, path: res.filePath };
});

ipcMain.handle("read-asset", async (_evt, relPath) => {
    const basePath = app.isPackaged
        ? path.join(process.resourcesPath, "app.asar", "renderer", "assets")
        : path.join(__dirname, "renderer", "assets");

    const full = path.join(basePath, relPath);

    const buf = await fs.readFile(full);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});


ipcMain.handle("read-package-json", async () => {
    const pkgPath = path.join(__dirname, "package.json");
    const raw = await fs.readFile(pkgPath, "utf8");
    return JSON.parse(raw);
});

ipcMain.handle("save-base64", async (_evt, { defaultName, base64, mime }) => {
    const res = await dialog.showSaveDialog({
        title: "Salva file",
        defaultPath: defaultName,
        filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (res.canceled || !res.filePath) return { saved: false };

    // se arriva dataUri, lo ripuliamo
    const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;

    const buf = Buffer.from(cleaned, "base64");
    await fs.writeFile(res.filePath, buf);

    return { saved: true, path: res.filePath };
});


ipcMain.handle("pick-output-folder", async () => {
    const res = await dialog.showOpenDialog({
        title: "Scegli cartella di salvataggio",
        properties: ["openDirectory", "createDirectory"]
    });
    if (res.canceled || !res.filePaths?.[0]) return null;
    return res.filePaths[0];
});

ipcMain.handle("save-base64-to-folder", async (_evt, { folder, fileName, base64 }) => {
    const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
    const buf = Buffer.from(cleaned, "base64");
    const fullPath = path.join(folder, fileName);
    await fs.writeFile(fullPath, buf);
    return { saved: true, path: fullPath };
});


//aggionamento
ipcMain.handle("check-update", async (_evt, { owner, repo }) => {
    const https = require("https");

    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    return await new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: "GET",
            headers: {
                "User-Agent": "ExtractorPdf",
                "Accept": "application/vnd.github+json"
            }
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on("error", reject);
        req.end();
    });
});

