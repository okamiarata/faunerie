import {FaunerieApp} from "./FaunerieApp";
import {ipcRenderer} from "electron";
import * as si from "systeminformation";
import fs from "fs";
import {Faunerie, FaunerieListType} from "libfaunerie";

export class FaunerieLoader {
    instance: FaunerieApp;
    dataPath: string;

    constructor(instance: FaunerieApp) {
        this.instance = instance;
    }

    async requestDatabaseOpen() {
        if (localStorage.getItem("path") === null) {
            let path = await ipcRenderer.invoke("openFolder");
            if (typeof path !== "object" && typeof path !== "string") {
                alert("Please select a folder and try again.");
                this.instance.dataStore.unloaded = true;
                window.close();
                return;
            }

            if (path instanceof Array) {
                localStorage.setItem("path", path[0]);
            } else {
                localStorage.setItem("path", path);
            }

            if (!require('fs').existsSync(localStorage.getItem("path") + "/instance.pbmk")) require('fs').writeFileSync(localStorage.getItem("path") + "/instance.pbmk", "");
        }
    }

    async getPossibleSources() {
        let mounts = (await si.fsSize()).map(i => i.mount);
        let list = [localStorage.getItem("path").replaceAll("\\", "/")];
        let parts = localStorage.getItem("path").replaceAll("\\", "/").split("/").filter(i => i.trim() !== "");

        for (let i = 1; i <= parts.length; i++) {
            for (let mount of mounts) {
                list.push(mount + "/" + parts.slice(0, i).join("/"));
            }
        }

        for (let i = 1; i <= parts.length; i++) {
            for (let mount of mounts) {
                let j = i + 1;

                while (j <= parts.length) {
                    list.push(mount + "/" + parts.slice(i, j).join("/"));
                    j++;
                }
            }
        }

        for (let i = 1; i <= parts.length; i++) {
            for (let mount of mounts) {
                list.push(mount + "/" + parts.slice(i, i + 1).join("/"));
            }
        }

        return [...new Set(list.map(i => i.replaceAll("//", "/").replaceAll("\\", "/")))];
    }

    async filterValidSources(list: string[]) {
        let validSources = [];
        let statFolders = ["images", "thumbnails"];
        let statFiles = ["current.pbdb", "instance.pbmk"];

        for (let item of list) {
            let validFolders = 0;
            let validFiles = 0;

            for (let folder of statFolders) {
                let valid = false;

                try {
                    valid = (await fs.promises.lstat(item + "/" + folder)).isDirectory();
                } catch (e) {
                }

                if (valid) validFolders++;
            }

            for (let file of statFiles) {
                let valid = false;

                try {
                    valid = (await fs.promises.lstat(item + "/" + file)).isFile();
                } catch (e) {
                }

                if (valid) validFiles++;
            }

            if (validFolders > 0 || validFiles > 0) {
                validSources.push(item);
            }
        }

        return validSources;
    }

    openFirstSource(validSources: string[]) {
        let selectedSource: string;

        if (validSources.filter(i => i === localStorage.getItem("path").replaceAll("\\", "/")).length > 0) {
            selectedSource = validSources.filter(i => i === localStorage.getItem("path").replaceAll("\\", "/"))[0];
        } else {
            selectedSource = validSources[0];
            this.instance.loadingError("Database was read from " + selectedSource + " as the normal path is not available");
        }

        return selectedSource;
    }

    async triggerInvalidSource(list: string[]) {
        alert("Unable to load images as no valid image source could be found.\n\nTried: " + list.join(", "));

        let path = await ipcRenderer.invoke("openFolder");
        if (typeof path !== "object" && typeof path !== "string") {
            alert("Please select a folder and try again.");
            this.instance.dataStore.unloaded = true;
            window.close();
            return;
        }

        if (path instanceof Array) {
            localStorage.setItem("path", path[0]);
        } else {
            localStorage.setItem("path", path);
        }

        if (!require('fs').existsSync(localStorage.getItem("path") + "/instance.pbmk")) require('fs').writeFileSync(localStorage.getItem("path") + "/instance.pbmk", "");

        location.reload();
    }

    async loadFromCache() {
        let _dataStore = this.instance.dataStore;
        let valid = false;

        try {
            valid = (await fs.promises.lstat(_dataStore.appData + "/FaunerieCache/current.pbdb")).isFile();
        } catch (e) {
            valid = false;
        }

        if (valid) {
            this.instance.loadingError("No valid image source found, images will be downloaded from their source");
            _dataStore.loadedFromCache = true;
            return _dataStore.appData + "/FaunerieCache";
        } else {
            alert("Unable to load images from cache as the cache is empty or corrupted.");
            this.instance.dataStore.unloaded = true;
            window.close();
        }
    }

    async loadAppropriateSource() {
        let _dataStore = this.instance.dataStore;

        _dataStore.loadedFromCache = false;

        let list = await this.getPossibleSources();
        let validSources = await this.filterValidSources(list);

        if (validSources.length > 0) {
            return this.openFirstSource(validSources);
        } else {
            if (fs.existsSync(_dataStore.appData + "/FaunerieCache")) {
                return await this.loadFromCache();
            } else {
                await this.triggerInvalidSource(list);
            }
        }
    }

    async findDatabase(): Promise<string> {
        document.getElementById("load").innerText = "Finding database...";

        await this.requestDatabaseOpen();

        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("progress").style.width = "0%";

        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("progress").style.width = "0%";

        this.instance.dataStore.source = this.dataPath = await this.loadAppropriateSource();
        return this.dataPath;
    }

    checkBusyUpdating() {
        if (require('fs').existsSync(this.dataPath + "/updater.pbmk")) {
            let pid = parseInt(require('fs').readFileSync(this.dataPath + "/updater.pbmk").toString().trim());
            let isUpdating = false;

            try {
                process.kill(pid, 0);
                isUpdating = true;
            } catch (e) {
                isUpdating = false;
            }

            if (isUpdating) {
                alert("This database is locked because an external Faunerie Updater is updating its content. Please try again later.");
                this.instance.dataStore.unloaded = true;
                window.close();
            }
        }
    }

    async initializeDatabase() {
        let _dataStore = this.instance.dataStore;

        _dataStore.database = new Faunerie({
            database: this.dataPath,
            cachePath: _dataStore.appData,
            sqlitePath: process.platform === "darwin" ? "../../../sql/mac" : "../../../sql/win",
            readOnly: false,
            sensitiveImageProtocol: true
        });

        await _dataStore.database.initialize(true);
        this.instance.createPropertyStore();
    }

    async updateCache() {
        let _dataStore = this.instance.dataStore;

        if (!_dataStore.loadedFromCache) {
            document.getElementById("load").innerText = "Updating cache...";
            document.getElementById("progress").classList.remove("progress-bar-striped");
            document.getElementById("progress").style.width = "0%";

            if (!fs.existsSync(_dataStore.appData + "/FaunerieCache")) await fs.promises.mkdir(_dataStore.appData + "/FaunerieCache");
            await fs.promises.copyFile(this.dataPath + "/current.pbdb", _dataStore.appData + "/FaunerieCache/current.pbdb");

            document.getElementById("progress").style.width = "100%";
        }
    }

    async completeLoading() {
        let _dataStore = this.instance.dataStore;

        _dataStore.db = await _dataStore.database.frontend.getAllImages(FaunerieListType.Object);
        _dataStore.tags = _dataStore.database.frontend.tags;
        _dataStore.tagsHashed = _dataStore.database.frontend.tagsHashed;

        if (_dataStore.hadErrorsLoading) {
            document.getElementById("load").innerText = "Finished loading with warnings.";
            document.getElementById("progress").classList.remove("progress-bar-striped");
            document.getElementById("progress").style.width = "100%";
            document.getElementById("loading-btn").classList.remove("disabled");
        } else {
            this.instance.finishLoading();
        }
    }
}
