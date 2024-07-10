const { app, BrowserWindow, ipcMain, dialog, clipboard, shell, Menu, protocol } = require('electron/main');
const fs = require("fs");
const util = require("util");
const zlib = require("zlib");

let preferences = null;
let globalConfig;

let mainWindow;
let fullscreenWindow;

protocol.registerSchemesAsPrivileged([
    { scheme: 'pbip', privileges: { bypassCSP: true, secure: true, stream: true, corsEnabled: false, supportFetchAPI: true } }
])

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 550,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        simpleFullscreen: true,
        titleBarStyle: "hidden",
        backgroundColor: "#212529",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.webContents.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.91 Safari/537.36");

    mainWindow.loadFile('index.html');
    mainWindow.setMenu(menu);
}

let menu = Menu.buildFromTemplate([
    {
        label: "Intimate",
        submenu: [
            {
                label: "About Intimate",
                role: "about"
            },
            {
                type: "separator"
            },
            {
                role: "services"
            },
            {
                type: "separator"
            },
            {
                label: "Hide Intimate",
                role: "hide"
            },
            {
                role: "hideOthers"
            },
            {
                role: "unhide"
            },
            {
                type: "separator"
            },
            {
                role: "quit"
            }
        ]
    },
    {
        role: "fileMenu"
    },
    {
        role: "editMenu"
    },
    {
        label: "View",
        submenu: [
            {
                role: "reload"
            },
            {
                role: "forceReload"
            },
            {
                role: "toggleDevTools"
            }
        ]
    },
    {
        role: "windowMenu"
    }
]);
Menu.setApplicationMenu(menu);

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

    app.setAboutPanelOptions({
        applicationName: "Intimate",
        applicationVersion: require('./package.json').version,
        version: (process.versions.electron.split(".").map(i => "00".substring(0, 2 - i.length) + i).join("") + "." + process.versions.node.split(".").map(i => "00".substring(0, 2 - i.length) + i).join("") + "." + process.versions.chrome.split(".").map(i => "00".substring(0, 2 - i.length) + i).join("")),//.split(".").map(i => parseInt(i).toString(36).toUpperCase()).join("."),
        copyright: "Copyright © Equestria.dev Developers. Licensed under the GNU AGPLv3 license, inspired by Equestria.dev internal proprietary code."
    });
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('before-quit', () => {
    try { if (mainWindow) mainWindow.close(); } catch (e) { console.error(e); }
    try { if (mainWindow) fullscreenWindow.close(); } catch (e) { console.error(e); }
});

ipcMain.on('start', (_, prefs, config) => {
    preferences = prefs;
    globalConfig = config;

    mainWindow.close();

    fullscreenWindow = new BrowserWindow({
        backgroundColor: "#000000",
        fullscreen: true,
        simpleFullscreen: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    fullscreenWindow.webContents.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.91 Safari/537.36");

    fullscreenWindow.loadFile("fullscreen.html");
    fullscreenWindow.on('close', () => {
        app.quit();
    });
});

ipcMain.handle('getConfig', () => {
    return {
        ...globalConfig,
        _sessionPreferences: preferences
    };
});

function pauseDialog(currentImage) {
    let ret = dialog.showMessageBoxSync(fullscreenWindow, {
        type: "info",
        buttons: [
            "Continue",
            "Copy image ID",
            "Copy source URL",
            "Copy file URL",
            "Open source in app",
            "Open file in app",
            "Quit"
        ],
        defaultId: 6,
        cancelId: 0,
        title: "Slideshow paused",
        message: "Slideshow paused",
        detail: "The slideshow is now paused. You may use this to take a break, take a closer look at the current image, or stop for now. Please select an action below.",
        textWidth: 300
    });

    switch (ret) {
        case 1:
            clipboard.writeText(currentImage.id.toString());
            break;

        case 2:
            clipboard.writeText(currentImage._source);
            break;

        case 3:
            clipboard.writeText(currentImage.view_url);
            break;

        case 4:
            shell.openExternal(currentImage._source);
            pauseDialog(currentImage);
            break;

        case 5:
            shell.openExternal(currentImage.view_url);
            pauseDialog(currentImage);
            break;

        case 6:
            fullscreenWindow.destroy();
            break;
    }
}

ipcMain.handle('pauseDialog', (_, currentImage) => {
    pauseDialog(currentImage);
});

ipcMain.handle('config', () => {
    if (!fs.existsSync(app.getPath("userData") + "/config.toml")) {
        fs.writeFileSync(app.getPath("userData") + "/config.toml", fs.readFileSync(__dirname + "/default.toml"));
    }

    return app.getPath("userData") + "/config.toml";
});

ipcMain.handle("openConfig", () => {
    shell.openPath(app.getPath("userData") + "/config.toml");
});

ipcMain.handle("openAbout", () => {
    app.showAboutPanel();
});

ipcMain.handle("openDevtools", () => {
    mainWindow.webContents.toggleDevTools();
});
