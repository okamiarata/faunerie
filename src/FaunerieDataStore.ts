import {FaunerieApp} from "./FaunerieApp";
import {Faunerie} from "libfaunerie";

export class FaunerieDataStore {
    public loaded: boolean;
    public loadedFromCache: boolean;
    public hadErrorsLoading: boolean;
    public searching: boolean;
    public source: string;
    public appData: string;
    public database: Faunerie;
    public db: object;
    public tags: any[][];
    public tagsHashed: object;
    public currentView: any[];
    public currentViewItems: any[];
    public page: number;
    public modal: any;
    public loader: any;
    public login: any;
    public unloaded: boolean;
    public currentImage: any;
    public currentImageClasses: any[];
    public needUpdate: boolean;
    public lastQuery: string;
    public lastPress: number;
    public close: boolean;

    constructor(instance: FaunerieApp) {
        let bootstrap = instance.bootstrap;

        this.page = 1;
        this.searching = false;
        this.unloaded = false;
        // @ts-ignore
        this.modal = new bootstrap.Modal(document.getElementById("preview"));
        // @ts-ignore
        this.loader = new bootstrap.Modal(document.getElementById("loader"));
        this.login = new bootstrap.Modal(document.getElementById("login"));
        this.loader.show();
        this.currentImage = null;
        this.currentImageClasses = [];
        this.hadErrorsLoading = false;
        this.lastQuery = "";
        this.loaded = false;
    }
}
