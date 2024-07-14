import {FaunerieApp} from "./FaunerieApp";
import {ChildProcess} from "node:child_process";
import {FaunerieImageType} from "libfaunerie";
import * as fs from "node:fs";
import * as cp from "node:child_process";

export class FaunerieAI {
    instance: FaunerieApp;
    aiProcess: ChildProcess;
    aiStarting: boolean;

    constructor(instance: FaunerieApp) {
        this.instance = instance;
    }

    get aiRunning() {
        return (!!this.aiProcess && this.aiProcess.exitCode === null) || this.aiStarting;
    }

    findPythonExecutable() {
        try {
            if (process.platform !== "darwin") throw new Error("Not running on macOS");
            cp.execFileSync("/usr/local/bin/python3.11", ["--version"], {cwd: __dirname + "/../ai"}).toString().trim();
            return "/usr/local/bin/python3.11";
        } catch (e) {
            try {
                cp.execFileSync("py", ["--version"], {cwd: __dirname + "/../ai"}).toString().trim();
                return "py";
            } catch (e) {
                try {
                    cp.execFileSync("python3.11", ["--version"], {cwd: __dirname + "/../ai"}).toString().trim();
                    return "python3.11";
                } catch (e) {
                    try {
                        cp.execFileSync("python3", ["--version"], {cwd: __dirname + "/../ai"}).toString().trim();
                        return "python3";
                    } catch (e) {
                        cp.execFileSync("python", ["--version"], {cwd: __dirname + "/../ai"}).toString().trim();
                        return "python";
                    }
                }
            }
        }
    }

    getPythonVersion() {
        return cp.execFileSync(this.findPythonExecutable(), ["--version"], {cwd: __dirname + "/../ai"}).toString().trim();
    }

    updateDependencies() {
        return new Promise<void>((res) => {
            this.aiProcess = cp.execFile(this.findPythonExecutable(), ["-m", "pip", "install", "-U", "torch", "ultralytics", "Pillow", "requests", "pandas", "opencv-python", "flask", "gitpython", "setuptools>=65.5.1"], {cwd: __dirname + "/../ai"});

            this.aiProcess.stdout.on('data', (d) => {
                console.debug(d.toString());
            });

            this.aiProcess.stderr.on('data', (d) => {
                console.debug(d.toString());
            });

            this.aiProcess.on('exit', () => {
                res();
            });
        });
    }

    triggerEngineStart() {
        this.aiProcess = cp.execFile(this.findPythonExecutable(), ["server.py"], {cwd: __dirname + "/../ai"});

        this.aiProcess.stdout.on('data', (d) => {
            console.debug(d.toString());
        });

        this.aiProcess.stderr.on('data', (d) => {
            console.debug(d.toString());
        });

        this.aiProcess.on('exit', () => {
            this.aiProcess = null;
        });
    }

    waitForEngine() {
        return new Promise<void>((res) => {
            let aiInterval = setInterval(async () => {
                try {
                    if ("data" in (await (await fetch("http://127.0.0.1:25091/status")).json())) {
                        clearInterval(aiInterval);
                        this.aiStarting = false;
                        res();
                    }
                } catch (e) {
                }
            }, 1000);
        })
    }

    validatePythonVersion() {
        let pyVersion: string = this.getPythonVersion();

        if (!pyVersion) {
            console.log("Unable to find a Python executable");
            throw new Error("Python not found");
        } else if (!pyVersion.startsWith("Python 3.11.") && pyVersion !== "Python 3.11") {
            console.log("Invalid Python version: " + pyVersion);
            throw new Error("Python not found");
        }
    }

    async startAI() {
        if (this.aiRunning) return;

        this.aiStarting = true;
        this.validatePythonVersion();
        await this.updateDependencies();
        this.triggerEngineStart();
        await this.waitForEngine();
    }

    async getClasses() {
        let _dataStore = this.instance.dataStore;
        let protectedDecode = (b: Buffer) => {
            return require('zlib').inflateRawSync(b);
        }

        await this.startAI();
        let url = _dataStore.database.frontend.getImageFile(_dataStore.currentImage, FaunerieImageType.ViewURL);
        let data: any;

        if (url.startsWith("blob:") || url.startsWith("pbip:")) {
            fs.writeFileSync(_dataStore.appData + "/.temp", protectedDecode(fs.readFileSync(_dataStore.database.frontend.getImageFile(_dataStore.currentImage, FaunerieImageType.ViewFile))));
            url = "file://" + (_dataStore.appData + "/.temp").replaceAll("\\", "/");
        }

        if (_dataStore.currentImage.tags.includes("safe")) {
            data = await (await fetch("http://127.0.0.1:25091/safe?url=" + encodeURIComponent(url.replace("file://", "")))).json();
        } else {
            data = await (await fetch("http://127.0.0.1:25091/explicit?url=" + encodeURIComponent(url.replace("file://", "")))).json();
        }

        if (fs.existsSync(_dataStore.appData + "/.temp")) fs.unlinkSync(_dataStore.appData + "/.temp");
        return data;
    }

    unload() {
        if (this.instance.dataStore.appData && fs.existsSync(this.instance.dataStore.appData + "/.temp")) fs.unlinkSync(this.instance.dataStore.appData + "/.temp");

        if (this.aiProcess) {
            console.log("Engine did not stop before quitting, forcefully killing it");
            this.aiProcess.kill("SIGKILL");
        }
    }

    makeClassesHTML(c: any) {
        let _dataStore = this.instance.dataStore;

        window.onresize = () => {
            document.getElementById("preview-zones").style.top = document.getElementById("preview-content-inner").offsetTop + "px";
            document.getElementById("preview-zones").style.left = document.getElementById("preview-content-inner").offsetLeft + "px";
            document.getElementById("preview-zones").style.width = document.getElementById("preview-content-inner").clientWidth + "px";
            document.getElementById("preview-zones").style.height = document.getElementById("preview-content-inner").clientHeight + "px";
        }

        window.onresize(null);
        _dataStore.currentImageClasses = c.data || [];

        let properClasses = _dataStore.currentImageClasses.filter(i => i.confidence > 0.5).map(i => {
            return {
                name: i.name,
                top: (i.ymin / _dataStore.currentImage.height) * 100,
                left: (i.xmin / _dataStore.currentImage.width) * 100,
                width: ((i.xmax - i.xmin) / _dataStore.currentImage.width) * 100,
                height: ((i.ymax - i.ymin) / _dataStore.currentImage.height) * 100
            }
        });
        document.getElementById("preview-zones").innerHTML = properClasses.map((i, j) => `
            <div onmouseenter="instance.display.highlightZone(${j}, true);" onmouseleave="instance.display.highlightZone(${j}, false);" class="preview-zone" id="preview-zone-${j}" style="opacity: 0; transition: opacity 100ms; border-radius: 1%; background-color: rgba(255, 255, 255, .25); border: 1px solid rgba(255, 255, 255, .5); width: ${i.width}%; height: ${i.height}%; top: ${i.top}%; left: ${i.left}%; position: absolute;"></div>
        `).join("");

        this.displayClassesList(properClasses);
    }

    displayClassesList(properClasses: any) {
        if (properClasses.length === 0) {
            document.getElementById("preview-parts-loader").style.display = "none";
            document.getElementById("preview-parts-none").style.display = "";
            document.getElementById("preview-parts-unsupported").style.display = "none";
            document.getElementById("preview-parts-list").style.display = "none";
        } else {
            document.getElementById("preview-parts-loader").style.display = "none";
            document.getElementById("preview-parts-none").style.display = "none";
            document.getElementById("preview-parts-unsupported").style.display = "none";
            document.getElementById("preview-parts-list").style.display = "";
            document.getElementById("preview-parts-list").innerHTML = properClasses.map((i, j) => `
                <a onmouseenter="instance.display.highlightZone(${j}, true);" onmouseleave="instance.display.highlightZone(${j}, false);" id="preview-tag-zone-${j}" class='preview-tag preview-tag-zone' href='#'>${i.name}</a>
            `).join("");
        }
    }

    displayClasses(id: string) {
        let _dataStore = this.instance.dataStore;

        if (_dataStore.currentImage.mime_type.startsWith("image/")) {
            if (_dataStore.currentImage.tags.includes("screencap") || !_dataStore.currentImage.tags.includes("safe")) {
                this.instance.ai.getClasses().then((c: any) => {
                    if (_dataStore.currentImage.id === parseInt(id)) {
                        this.makeClassesHTML(c);
                    }
                });
            } else {
                document.getElementById("preview-parts-loader").style.display = "none";
                document.getElementById("preview-parts-none").style.display = "";
                document.getElementById("preview-parts-unsupported").style.display = "none";
                document.getElementById("preview-parts-list").style.display = "none";
            }
        } else {
            document.getElementById("preview-parts-loader").style.display = "none";
            document.getElementById("preview-parts-none").style.display = "none";
            document.getElementById("preview-parts-unsupported").style.display = "";
            document.getElementById("preview-parts-list").style.display = "none";
        }
    }
}
