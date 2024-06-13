const { app, BrowserWindow, ipcMain, dialog, clipboard, shell, Menu } = require('electron/main');
const fs = require("fs");

let e621 = false;
let derpibooru = false;
let local = false;
let globalConfig;

let mainWindow;
let fullscreenWindow;

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 450,
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

ipcMain.on('start', (_, enableDerpibooru, enableE621, enableLocal, config) => {
    derpibooru = enableDerpibooru;
    e621 = enableE621;
    local = enableLocal;
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

    fullscreenWindow.loadFile("fullscreen.html");
    fullscreenWindow.on('close', () => {
        app.quit();
    });
});

ipcMain.handle('getConfig', () => {
    return {
        ...globalConfig,
        _show: {
            e621,
            derpibooru,
            local
        }
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
