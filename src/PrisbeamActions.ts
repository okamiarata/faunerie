import {PrisbeamApp} from "./PrisbeamApp";

export class PrisbeamActions {
    instance: PrisbeamApp;

    constructor(instance: PrisbeamApp) {
        this.instance = instance;
    }

    goHome() {
        this.instance.search.startTagSearch("");
    }
}
