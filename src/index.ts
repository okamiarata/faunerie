import {ipcRenderer} from "electron";
import {FaunerieApp} from "./FaunerieApp";

let loaded = false;

window.onload = () => {
    loaded = true;
}

// noinspection JSUnusedGlobalSymbols
export function runApp(bootstrap: any) {
    ipcRenderer.on('path', (_, appDataPath) => {
        let instance = window['instance'] = new FaunerieApp(bootstrap);
        instance.dataStore.appData = appDataPath;

        let loadInterval = setInterval(() => {
            if (loaded) {
                clearInterval(loadInterval);
                instance.loadApp();
            }
        });

        window.onclose = () => {
            instance.dataStore.close = true;
        }

        window.onbeforeunload = (e: DOMEvent) => {
            if (instance.dataStore.database && !instance.dataStore.unloaded) {
                e.preventDefault();
                instance.safeReload();
            }
        };

        document.getElementById("preview").addEventListener('hide.bs.modal', () => {
            document.getElementById("preview-content").innerHTML = "";
            instance.display.updateTitle();
        });

        instance.bootstrapTooltips();
    });
}
