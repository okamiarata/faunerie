import {FaunerieApp} from "./FaunerieApp";
import * as fs from "node:fs";
import * as path from "node:path";
import {FaunerieImageType, FaunerieListType} from "libfaunerie";

export class FaunerieSettings {
    instance: FaunerieApp;

    constructor(instance: FaunerieApp) {
        this.instance = instance;
    }

    async getThumbnailFiles() {
        let _dataStore = this.instance.dataStore;
        let files = [];
        let filesPre = await fs.promises.readdir(_dataStore.source + "/thumbnails");

        for (let i of filesPre) {
            if ((await fs.promises.lstat(_dataStore.source + "/thumbnails/" + i)).isDirectory()) {
                let list = await fs.promises.readdir(_dataStore.source + "/thumbnails/" + i);

                for (let j of list) {
                    if ((await fs.promises.lstat(_dataStore.source + "/thumbnails/" + i + "/" + j)).isDirectory()) {
                        let list2 = await fs.promises.readdir(_dataStore.source + "/thumbnails/" + i + "/" + j);

                        for (let k of list2) {
                            if ((await fs.promises.lstat(_dataStore.source + "/thumbnails/" + i + "/" + j + "/" + k)).isDirectory()) {
                                let list3 = await fs.promises.readdir(_dataStore.source + "/thumbnails/" + i + "/" + j + "/" + k);

                                for (let l of list3) {
                                    files.push(_dataStore.source + "/thumbnails/" + i + "/" + j + "/" + k + "/" + l);
                                }
                            }
                        }
                    }
                }
            }
        }

        return files;
    }

    async getImageFiles() {
        let _dataStore = this.instance.dataStore;
        let files = [];
        let filesPre = await fs.promises.readdir(_dataStore.source + "/images");

        for (let i of filesPre) {
            if ((await fs.promises.lstat(_dataStore.source + "/images/" + i)).isDirectory()) {
                let list = await fs.promises.readdir(_dataStore.source + "/images/" + i);

                for (let j of list) {
                    if ((await fs.promises.lstat(_dataStore.source + "/images/" + i + "/" + j)).isDirectory()) {
                        let list2 = await fs.promises.readdir(_dataStore.source + "/images/" + i + "/" + j);

                        for (let k of list2) {
                            if ((await fs.promises.lstat(_dataStore.source + "/images/" + i + "/" + j + "/" + k)).isDirectory()) {
                                let list3 = await fs.promises.readdir(_dataStore.source + "/images/" + i + "/" + j + "/" + k);

                                for (let l of list3) {
                                    files.push(_dataStore.source + "/images/" + i + "/" + j + "/" + k + "/" + l);
                                }
                            }
                        }
                    }
                }
            }
        }

        return files;
    }

    async processList(files: string[]) {
        let _dataStore = this.instance.dataStore;

        let total = files.length;
        let index = 0;
        let orphans = [];

        for (let file of files) {
            document.getElementById("load").innerText = "Looking for orphan files... " + file;

            if (!(await _dataStore.database.frontend.getImage(path.basename(file, path.extname(file))))) {
                orphans.push(file);
            }

            index++;
            document.getElementById("progress").style.width = ((index / total) * 100) + "%";
        }

        return orphans;
    }

    async processOrphans(orphans: string[]): Promise<boolean> {
        let hadErrors = false;

        document.getElementById("load").innerText = "Removing orphan files...";
        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("progress").style.width = "0%";

        let index = 0;

        for (let orphan of orphans) {
            document.getElementById("load").innerText = "Removing orphan files... " + orphan;
            document.getElementById("progress").classList.remove("progress-bar-striped");
            document.getElementById("progress").style.width = ((index / orphans.length) * 100) + "%";

            try {
                await fs.promises.unlink(orphan);
            } catch (e) {
                console.error(e);
                this.instance.loadingError("Failed to remove " + orphan);
                hadErrors = true;
            }

            index++;
        }

        return hadErrors;
    }

    async removeOrphans() {
        let _dataStore = this.instance.dataStore;
        if (_dataStore.loadedFromCache) return;

        _dataStore.loader.show();
        _dataStore.hadErrorsLoading = false;
        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("loader-errors-list").innerHTML = "";
        document.getElementById("loader-errors").style.display = "none";

        document.getElementById("load").innerText = "Looking for orphan files...";
        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("progress").style.width = "0%";

        let files = [
            ...(await this.getThumbnailFiles()),
            ...(await this.getImageFiles())
        ];

        let hadErrors = false;
        let orphans = await this.processList(files);

        if (orphans.length > 0) {
            hadErrors = await this.processOrphans(orphans);
        }

        document.getElementById("load").innerText = hadErrors ? "This operation completed with some errors." : "This operation completed successfully.";
        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("progress").style.width = "100%";
        document.getElementById("loading-btn").classList.remove("disabled");
        document.getElementById("loader-errors").style.display = "";
    }

    private protectedEncode(b: string | ArrayBuffer) {
        return require('zlib').deflateRawSync(b, {level: 9});
    }

    checkImageForCorruptions(image: any): Promise<boolean> {
        let i = image;
        let instance = this.instance;
        let _dataStore = this.instance.dataStore;

        return new Promise<boolean>(async (res) => {
            function next() {
                let imageIsCorrupted: Function;
                let img = i['mime_type'].startsWith("image/") ? new Image() : document.createElement("video");
                img.onload = img.oncanplaythrough = () => {
                    img.remove();
                    if ("srcObject" in img) img.srcObject = null;
                    // noinspection HttpUrlsUsage
                    if (img.src.startsWith("https://") || img.src.startsWith("http://")) imageIsCorrupted();
                    res(false);
                }
                img.onerror = imageIsCorrupted = () => {
                    instance.loadingError("Image " + i.id + " is corrupted");
                    res(true);
                }
                img.src = _dataStore.database.frontend.getImageFile(i, FaunerieImageType.ViewURL);
            }

            let imageIsCorrupted: Function;
            let img = new Image();
            img.onload = img.oncanplaythrough = () => {
                img.remove();
                if ("srcObject" in img) img.srcObject = null;
                // noinspection HttpUrlsUsage
                if (img.src.startsWith("https://") || img.src.startsWith("http://")) imageIsCorrupted();
                next();
            }
            img.onerror = imageIsCorrupted = () => {
                instance.loadingError("Image " + i.id + " is corrupted");
                res(true);
            }
            img.src = _dataStore.database.frontend.getImageFile(i, FaunerieImageType.ThumbnailURL);
        });
    }

    async repairCorruptedImage(i: any) {
        let _dataStore = this.instance.dataStore;

        try {
            await fs.promises.writeFile(_dataStore.source + "/images/" + (i['sha512_hash'] ?? i['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (i['sha512_hash'] ?? i['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + i.id + ".bin", this.protectedEncode(Buffer.from(await (await fetch(i['view_url'])).arrayBuffer())));
            await fs.promises.writeFile(_dataStore.source + "/thumbnails/" + (i['sha512_hash'] ?? i['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (i['sha512_hash'] ?? i['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + i.id + ".bin", this.protectedEncode(Buffer.from(await (await fetch(i['representations']['thumb'])).arrayBuffer())));
            return true;
        } catch (e) {
            console.error(e);
            this.instance.loadingError("Failed to repair image " + i.id);
            return false;
        }
    }

    finishRepairing(hadErrorsFixing: boolean) {
        if (this.instance.dataStore.hadErrorsLoading) {
            if (hadErrorsFixing) {
                document.getElementById("load").innerText = "Corrupted files found and could not be repaired.";
            } else {
                document.getElementById("load").innerText = "Corrupted files found and repaired successfully.";
            }

            document.getElementById("progress").classList.remove("progress-bar-striped");
            document.getElementById("progress").style.width = "100%";
            document.getElementById("loading-btn").classList.remove("disabled");
        } else {
            document.getElementById("load").innerText = "No corrupted files found.";
            document.getElementById("progress").classList.remove("progress-bar-striped");
            document.getElementById("progress").style.width = "100%";
            document.getElementById("loading-btn").classList.remove("disabled");
            document.getElementById("loader-errors").style.display = "";
        }
    }

    async repairScanForCorruptions() {
        let corrupted = [];
        let _dataStore = this.instance.dataStore;

        _dataStore.loader.show();
        _dataStore.hadErrorsLoading = false;
        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("loader-errors-list").innerHTML = "";
        document.getElementById("loader-errors").style.display = "none";
        document.getElementById("load").innerText = "Checking for corrupted images...";

        let total = await _dataStore.database.frontend.countImages();
        let index = 0;

        document.getElementById("progress").style.width = "0%";

        for (let image of await _dataStore.database.frontend.getAllImages(FaunerieListType.Array) as any[]) {
            document.getElementById("load").innerText = "Checking for corrupted images... " + Math.round(((index / total) * 100)) + "% (" + image.id + ")";
            if (await this.checkImageForCorruptions(image)) {
                corrupted.push(image);
            }

            index++;
            document.getElementById("progress").style.width = ((index / total) * 100) + "%";
        }

        document.getElementById("progress").style.width = "0%";
        document.getElementById("load").innerText = "Repairing corrupted images...";
        index = 0;

        return corrupted;
    }

    async repairProcessCorruptions(corrupted: any[]) {
        let hadErrorsFixing = false;
        let index = 0;

        for (let file of corrupted) {
            hadErrorsFixing = hadErrorsFixing && await this.repairCorruptedImage(file);

            document.getElementById("progress").style.width = ((index / corrupted.length) * 100) + "%";
            document.getElementById("load").innerText = "Repairing corrupted images... " + Math.round(((index / corrupted.length) * 100)) + "% (" + file.id + ")";
            index++;
        }

        return hadErrorsFixing;
    }

    async repairCorruptions() {
        if (this.instance.dataStore.loadedFromCache) return;

        this.finishRepairing(
            await this.repairProcessCorruptions(
                await this.repairScanForCorruptions()
            )
        )
    }
}
