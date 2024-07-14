import {FaunerieDataStore} from "./FaunerieDataStore";
import {FaunerieListType} from "libfaunerie";
import {FaunerieAppDisplay} from "./FaunerieAppDisplay";
import {FaunerieSettings} from "./FaunerieSettings";
import {FaunerieSearch} from "./FaunerieSearch";
import {FaunerieActions} from "./FaunerieActions";
import {FaunerieAI} from "./FaunerieAI";
import {FaunerieLoader} from "./FaunerieLoader";
import {FauneriePropertyStore} from "libfaunerie/src/FauneriePropertyStore";
import {FaunerieDerpibooru} from "./FaunerieDerpibooru";

export class FaunerieApp {
    dataStore: FaunerieDataStore;
    bootstrap: any;
    display: FaunerieAppDisplay;
    settings: FaunerieSettings;
    search: FaunerieSearch;
    actions: FaunerieActions;
    ai: FaunerieAI;
    loader: FaunerieLoader;
    propertyStore: FauneriePropertyStore;
    derpibooru: FaunerieDerpibooru;

    constructor(bootstrap: any) {
        this.bootstrap = bootstrap;
        this.dataStore = new FaunerieDataStore(this);
        this.display = new FaunerieAppDisplay(this);
        this.settings = new FaunerieSettings(this);
        this.search = new FaunerieSearch(this);
        this.actions = new FaunerieActions(this);
        this.ai = new FaunerieAI(this);
        this.loader = new FaunerieLoader(this);
        this.derpibooru = new FaunerieDerpibooru(this);

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
        this.dataStore.currentView = await this.dataStore.database.frontend.getAllImages(FaunerieListType.Array) as any[];
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

        if (process.platform === "win32") {
            document.getElementById("filter-bar").style.paddingRight = "96px";
        }

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
