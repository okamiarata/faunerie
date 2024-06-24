// noinspection JSCheckFunctionSignatures

require('os').setPriority(19);

const { app, Tray, Menu, shell } = require('electron');
const fs = require('fs');
const libprisbeam = require('libprisbeam');
const execCb = require('child_process').exec;

let tray = null;

app.whenReady().then(() => {
    const config = app.getPath("userData");
    if (!fs.existsSync(config + "/database.txt")) fs.writeFileSync(config + "/database.txt", "# Insert the full path to your Prisbeam database below:\n\n# Insert your Derpibooru username below:\n\n# (if you have not registered for Prisbeam Cloud, please contact Equestria.dev)");
    if (!fs.existsSync(config + "/last.txt")) fs.writeFileSync(config + "/last.txt", "0");

    if (process.platform === "darwin") app.dock.hide();
    tray = new Tray(__dirname + "/tray/16x16Template@2x.png");
    tray.setToolTip("Prisbeam Updater");

    let update = null;

    async function startUpdate() {
        try {
            let databasePath = fs.readFileSync(config + "/database.txt").toString().trim().split("\n").filter(i => !i.startsWith("#") && i.trim() !== "")[0];
            let userName = fs.readFileSync(config + "/database.txt").toString().trim().split("\n").filter(i => !i.startsWith("#") && i.trim() !== "")[1];

            if (fs.existsSync(config + "/temp")) fs.rmSync(config + "/temp", { recursive: true });
            fs.mkdirSync(config + "/temp");

            update = [
                {
                    title: "Preparing update..."
                },
                {
                    title: "Downloading update data..."
                }
            ];
            updateTray();

            await new Promise((res) => {
                let p = execCb("curl \"https://cdn.equestria.dev/prisbeam/users/" + userName + ".db\" -o \"" + config + "/temp/preprocessed.db\"", () => {
                    res();
                });

                let percent = 0;
                let data = (d) => {
                    let lines = d.trim().split("\n");
                    let line = lines[lines.length - 1];

                    let lineProcessed = line.replace(/^(\d+) (\d|\.)+M .*$/gm, "$1").trim();
                    if (lineProcessed !== line && !isNaN(parseInt(lineProcessed))) {
                        percent = lineProcessed;
                    }

                    update = [
                        {
                            title: "Preparing update..."
                        },
                        {
                            title: "Downloading update data..." + (percent > 0 ? " (" + Math.round(percent / 2) + "%)" : "")
                        }
                    ];
                    if (percent > 0) updateTray();
                };

                p.stdout.on('data', data);
                p.stderr.on('data', data);
            });

            await new Promise((res) => {
                let p = execCb("curl \"https://cdn.equestria.dev/prisbeam/common/tags.db\" -o \"" + config + "/temp/tags.db\"", () => {
                    res();
                });

                let percent = 0;
                let data = (d) => {
                    let lines = d.trim().split("\n");
                    let line = lines[lines.length - 1];

                    let lineProcessed = line.replace(/^(\d+) (\d|\.)+M .*$/gm, "$1").trim();
                    if (lineProcessed !== line && !isNaN(parseInt(lineProcessed))) {
                        percent = lineProcessed;
                    }

                    update = [
                        {
                            title: "Preparing update..."
                        },
                        {
                            title: "Downloading update data..." + (percent > 0 ? " (" + (50 + Math.round(percent / 2)) + "%)" : "")
                        }
                    ];
                    if (percent > 0) updateTray();
                };

                p.stdout.on('data', data);
                p.stderr.on('data', data);
            });

            fs.writeFileSync(databasePath + "/updater.pbmk", process.pid.toString());

            let database = new libprisbeam.Prisbeam({
                database: databasePath,
                cachePath: config + "/temp",
                sqlitePath: process.platform === "darwin" ? "../../../sql/mac" : "../../../sql/win",
                readOnly: false,
                sensitiveImageProtocol: true,
                verbose: false
            });
            await database.initialize(true);

            let updater = new libprisbeam.PrisbeamUpdater(database);
            await updater.updateFromPreprocessed(config + "/temp/preprocessed.db", config + "/temp/tags.db", (status) => {
                update = status;
                updateTray();
            });

            fs.unlinkSync(databasePath + "/updater.pbmk");
            if (fs.existsSync(config + "/temp")) fs.rmSync(config + "/temp", { recursive: true });

            fs.copyFileSync(databasePath + "/current.pbdb", databasePath + "/updated.pbdb");

            update = null;
            fs.writeFileSync(config + "/last.txt", new Date().getTime().toString());
            updateTray();
        } catch (e) {
            console.error(e);
            update = null;
        }
    }

    function updateTray() {
        let template = [
            { label: "Prisbeam Updater", type: 'normal', enabled: false, icon: __dirname + "/menu/16x16@2x.png" },

            { type: 'separator' },
        ];

        let databasePath = fs.readFileSync(config + "/database.txt").toString().trim().split("\n").filter(i => !i.startsWith("#") && i.trim() !== "")[0];
        let lastUpdate = parseInt(fs.readFileSync(config + "/last.txt").toString());

        if (databasePath && fs.existsSync(databasePath) && fs.existsSync(databasePath + "/current.pbdb")) {
            if (update) {
                template.push(...[
                    ...update.filter(i => i).map(i => {
                        return { label: i['title'], enabled: false }
                    }),

                    { type: 'separator' },

                    { label: "Open Prisbeam", enabled: false },
                ]);
            } else {
                template.push(...[
                    { label: "Last Database Update:", type: 'normal', enabled: false },
                    { label: lastUpdate > 0 ? new Date(lastUpdate).toLocaleString("en-CA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "Never", type: 'normal', enabled: false },

                    { type: 'separator' },

                    { label: "Update Database Now", click: () => {
                        startUpdate();
                    } },

                    { type: 'separator' },

                    { label: "Open Prisbeam", enabled: false, },
                ]);
            }
        } else {
            template.push(...[
                { label: "Updater Not Configured", type: 'normal', enabled: false },

                { type: 'separator' },

                { label: "Change Database Path", click: () => {
                    shell.openPath(config + "/database.txt");
                } },

                { type: 'separator' },

                { label: "Open Prisbeam", enabled: false },
            ]);
        }

        template.push({ label: "Quit", role: "quit" });

        tray.setContextMenu(Menu.buildFromTemplate(template));
    }

    updateTray();
    setInterval(() => {
        if (update) return;
        let lastUpdate = parseInt(fs.readFileSync(config + "/last.txt").toString());
        let difference = new Date().getTime() - lastUpdate;

        if (difference > 86400000) {
            startUpdate();
        }
    }, 60000);
})
