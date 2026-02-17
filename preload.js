const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("api", {
    pickPdfFiles: () => ipcRenderer.invoke("pick-pdf-files"),
    readFile: (p) => ipcRenderer.invoke("read-file", p),
    saveBytes: (defaultName, bytes) => ipcRenderer.invoke("save-bytes", { defaultName, bytes }),
    saveText: (defaultName, text) => ipcRenderer.invoke("save-text", { defaultName, text }),
    readAsset: (relPath) => ipcRenderer.invoke("read-asset", relPath),

    readPackageJson: () => ipcRenderer.invoke("read-package-json"),
    openExternal: (url) => shell.openExternal(url),

    checkUpdate: (owner, repo) => ipcRenderer.invoke("check-update", { owner, repo }),

    saveBase64: (defaultName, base64, mime = "application/pdf") =>
        ipcRenderer.invoke("save-base64", { defaultName, base64, mime }),
    pickOutputFolder: () => ipcRenderer.invoke("pick-output-folder"),
    saveBase64ToFolder: (folder, fileName, base64) =>
        ipcRenderer.invoke("save-base64-to-folder", { folder, fileName, base64 }),

});
