import {FaunerieApp} from "./FaunerieApp";

export class FaunerieActions {
    instance: FaunerieApp;

    constructor(instance: FaunerieApp) {
        this.instance = instance;
    }

    goHome() {
        this.instance.search.startTagSearch("");
    }
}
