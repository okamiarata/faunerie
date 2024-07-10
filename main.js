const {app, dialog, BrowserWindow, ipcMain, protocol} = require('electron');
const zlib = require('zlib');
const fs = require('fs');
const util = require('util');
const {userInfo} = require('os');
const remote = require("@electron/remote/main");

protocol.registerSchemesAsPrivileged([
    { scheme: 'pbip', privileges: { bypassCSP: true, secure: true, stream: true, corsEnabled: false, supportFetchAPI: true } }
])

remote.initialize();

function open() {
    let win = global.win = new BrowserWindow({
        width: 1500,
        minWidth: 800,
        title: "Faunerie",
        height: 800,
        minHeight: 450,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        },
        titleBarStyle: "hidden",
        titleBarOverlay: {
            color: "transparent",
            symbolColor: "#ffffff",
            height: 43
        },
        backgroundColor: "#222222",
        trafficLightPosition: {
            x: 13,
            y: 13
        },
    });

    remote.enable(win.webContents);

    win.on('close', async (e) => {
        if (await win.webContents.executeJavaScript("instance?.dataStore.unloaded;")) e.preventDefault();
        await win.webContents.executeJavaScript("instance?.safeClose();");
    })

    win.loadFile("./dom/index.html");
    win.on('ready-to-show', () => {
        //@ts-ignore
        win.send("path", app.getPath("userData"));
    });

    ipcMain.handle('openFolder', () => {
        return dialog.showOpenDialogSync({
            title: "Select the directory where your database has been saved",
            message: "Select the directory where your database has been saved",
            defaultPath: userInfo().homedir,
            buttonLabel: "Open",
            properties: ["openDirectory", "treatPackageAsDirectory", "dontAddToRecent", "createDirectory"]
        });
    });

    ipcMain.handle('openPreprocessed', () => {
        return dialog.showOpenDialogSync({
            title: "Select the file corresponding to your preprocessed database",
            message: "Select the file corresponding to your preprocessed database",
            defaultPath: userInfo().homedir,
            buttonLabel: "Open",
            properties: ["openFile", "treatPackageAsDirectory", "dontAddToRecent"]
        });
    });
}

if (app.getName() !== "Electron") {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
    }
}

app.whenReady().then(() => {
    protocol.handle('pbip', async (req) => {
        const { pathname, searchParams } = new URL(req.url);
        let mime = searchParams.get("mime") ?? "application/octet-stream";

        const inflateRawSync = util.promisify(zlib.inflateRaw);

        try {
            let file = await fs.promises.readFile(pathname);
            let data = await inflateRawSync(file);

            return new Response(data, {
                status: 200,
                headers: { 'content-type': mime }
            });
        } catch (e) {
            console.error(e);

            return new Response(e.stack, {
                status: 500,
                headers: { 'content-type': 'text/plain' }
            });
        }

    });

    open();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) open();
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
