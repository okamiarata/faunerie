import {PrisbeamDataStore} from "./PrisbeamDataStore";
import {PrisbeamListType} from "libprisbeam";
import {PrisbeamAppDisplay} from "./PrisbeamAppDisplay";
import {PrisbeamSettings} from "./PrisbeamSettings";
import {PrisbeamSearch} from "./PrisbeamSearch";
import {PrisbeamActions} from "./PrisbeamActions";
import {PrisbeamAI} from "./PrisbeamAI";
import {PrisbeamLoader} from "./PrisbeamLoader";
import {PrisbeamPropertyStore} from "libprisbeam/src/PrisbeamPropertyStore";
import {PrisbeamDerpibooru} from "./PrisbeamDerpibooru";

export class PrisbeamApp {
    dataStore: PrisbeamDataStore;
    bootstrap: any;
    display: PrisbeamAppDisplay;
    settings: PrisbeamSettings;
    search: PrisbeamSearch;
    actions: PrisbeamActions;
    ai: PrisbeamAI;
    loader: PrisbeamLoader;
    propertyStore: PrisbeamPropertyStore;
    derpibooru: PrisbeamDerpibooru;

    constructor(bootstrap: any) {
        this.bootstrap = bootstrap;
        this.dataStore = new PrisbeamDataStore(this);
        this.display = new PrisbeamAppDisplay(this);
        this.settings = new PrisbeamSettings(this);
        this.search = new PrisbeamSearch(this);
        this.actions = new PrisbeamActions(this);
        this.ai = new PrisbeamAI(this);
        this.loader = new PrisbeamLoader(this);
        this.derpibooru = new PrisbeamDerpibooru(this);

        this.search.loadSearchModule();
    }

    createPropertyStore() {
        this.propertyStore = this.dataStore.database.propertyStore;
    }

    async finishLoading() {
        document.getElementById("loading-btn").classList.add("disabled");

        document.getElementById("load").innerText = "Loading interface...";
        document.getElementById("progress").classList.add("progress-bar-striped");
        document.getElementById("progress").style.width = "100%";

        this.dataStore.loaded = true;
        this.dataStore.page = 1;
        this.dataStore.currentView = await this.dataStore.database.frontend.getAllImages(PrisbeamListType.Array) as any[];
        this.display.updateDisplay();

        this.dataStore.loader.hide();
        document.getElementById("app").classList.remove("disabled");
    }

    loadingError(msg: string) {
        let li = document.createElement("li");
        li.classList.add("list-group-item");
        li.classList.add("list-group-item-warning");
        li.innerHTML = msg;

        document.getElementById("loader-errors-list").append(li);
        document.getElementById("loader-errors").style.display = "";
        this.dataStore.hadErrorsLoading = true;
    }

    async loadApp() {
        if (this.dataStore.loaded) return;

        document.getElementById("load").innerText = "Waiting for application...";
        document.getElementById("progress").classList.remove("progress-bar-striped");
        document.getElementById("progress").style.width = "0%";

        await this.loader.findDatabase();
        this.loader.checkBusyUpdating();
        await this.loader.initializeDatabase();
        await this.loader.updateCache();
        await this.loader.completeLoading();
        await this.derpibooru.initialize();
    }

    safeUnload() {
        let modal = new this.bootstrap.Modal(document.getElementById("close-dialog"));
        modal.show();

        return new Promise<void>((res) => {
            this.ai.unload();

            if (!this.derpibooru.window?.isDestroyed()) {
                this.derpibooru.window.destroy();
            }

            if (this.dataStore.database && !this.dataStore.unloaded) {
                (async () => {
                    try {
                        await this.dataStore.database.close();
                    } catch (e) {
                        console.error(e);
                    }

                    this.dataStore.unloaded = true;

                    res();
                })();
            } else {
                res();
            }
        });
    }

    async safeReload() {
        await this.safeUnload();
        location.reload();
    }

    // noinspection JSUnusedGlobalSymbols
    async safeClose() {
        await this.safeUnload();
        window.close();
    }

    bootstrapTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        //@ts-ignore
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }
}
