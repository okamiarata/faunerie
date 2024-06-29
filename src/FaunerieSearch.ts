import {FaunerieApp} from "./FaunerieApp";
import {FaunerieListType} from "libfaunerie";

export class FaunerieSearch {
    instance: FaunerieApp;

    constructor(instance: FaunerieApp) {
        this.instance = instance;
    }

    startTagSearch(tag: string) {
        this.instance.dataStore.modal.hide();
        (document.getElementById("search") as HTMLInputElement).value = tag;
        this.updateSearch();
        this.instance.display.updateDisplay();
    }

    searchError(e: Error, query: string, sql: string = null) {
        this.instance.dataStore.currentView = [];

        document.getElementById("search-error").style.display = "";
        document.getElementById("pages").style.display = "none";
        document.getElementById("search-error").innerHTML = `
            <p><b>${this.resolveError(e)}</b></p>
            <p>Faunerie uses the same search query format as Derpibooru/Philomena. To make sure you make correct use of the search syntax, you can try to search for the same query on Derpibooru directly (if possible). Please keep in mind that fuzzy matching, boosting, escaping, the <code>faved_by</code> and <code>uploader</code> fields as well as the <code>my:hidden</code> are not supported.</code></p>
            <p>If you think something is wrong with Faunerie, please send a bug report, so we can fix it.</p>
            <hr>
            <details>
                <summary>Show technical information</summary>
                <pre style='margin-bottom: 0;'>Query: ${query.substring(0, 1024)}${sql ? `\n\nSQL: ${sql.substring(0, 1024)}` : ""}\n\nError dump:\n${e.stack
                    .replaceAll("&", "&amp;")
                    .replaceAll(">", "&gt;")
                    .replaceAll("<", "&lt;")}</pre>
            </details>
        `;
    }

    async displayAll() {
        this.instance.dataStore.page = 1;
        this.instance.dataStore.searching = false;
        this.instance.dataStore.currentView = await this.instance.dataStore.database.frontend.getAllImages(FaunerieListType.Array) as any[];
        this.instance.display.updateDisplay();
    }

    async updateSearch() {
        document.getElementById("images").classList.add("searching");
        document.getElementById("search-error").style.display = "none";
        document.getElementById("search-warning").style.display = "none";
        document.getElementById("pages").style.display = "";

        if ((document.getElementById("search") as HTMLInputElement).value.trim() !== "") {
            this.instance.dataStore.searching = true;
            this.instance.dataStore.page = 1;

            try {
                this.instance.dataStore.currentView = await this.initiateSearch((document.getElementById("search") as HTMLInputElement).value.trim());
            } catch (e) {
                console.error(e);
                let query = (document.getElementById("search") as HTMLInputElement).value.trim();
                let sql: string;

                try {
                    sql = this.instance.dataStore.database.frontend.searchEngine.buildQueryV2(query, false);
                } catch (e) {}

                this.searchError(e, query, sql);
            }

            this.instance.display.updateDisplay();
        } else {
            this.displayAll();
        }

        document.getElementById("images").classList.remove("searching");
        (document.getElementById('search') as HTMLInputElement).disabled = false;
        document.getElementById('filter-bar').classList.remove("disabled");
    }

    resolveError(e: Error) {
        if (e.name === "SyntaxError") {
            if (e.message === "Unexpected end of input") {
                return "Unclosed parenthesis or quote, or trailing operator";
            }

            if (e.message === "Unexpected token ')'") {
                return "Empty parenthesis statement or trailing close parenthesis";
            }
        }

        if (e.name === "SearchError" || e.stack.startsWith("SearchError: ")) {
            return e.message
                .replaceAll("&", "&amp;")
                .replaceAll(">", "&gt;")
                .replaceAll("<", "&lt;");
        }

        return "An error has occurred while processing your search query";
    }

    initiateSearch(query: string): Promise<any> {
        return new Promise(async (res, rej) => {
            try {
                res(await this.instance.dataStore.database.frontend.search(query));
            } catch (e) {
                rej(e);
            }
        });
    }

    loadSearchModule() {
        setInterval(() => {
            let _dataStore = this.instance.dataStore;

            if (new Date().getTime() - _dataStore.lastPress > 1000 && _dataStore.needUpdate && _dataStore.lastQuery.trim().toLowerCase() !== (document.getElementById('search') as HTMLInputElement).value.trim().toLowerCase()) {
                _dataStore.needUpdate = false;
                _dataStore.lastQuery = (document.getElementById('search') as HTMLInputElement).value;
                (document.getElementById('search') as HTMLInputElement).disabled = true;
                document.getElementById('filter-bar').classList.add("disabled");
                this.updateSearch();
            }
        }, 50);

        document.getElementById("search").onkeydown = (event) => {
            if (event.key === "Enter") {
                this.instance.dataStore.lastPress = new Date().getTime() - 5000; this.instance.dataStore.needUpdate = true;
            } else {
                this.instance.dataStore.lastPress = new Date().getTime(); this.instance.dataStore.needUpdate = true;
            }
        }
    }

    async viewPage(n: number) {
        this.instance.dataStore.page = n;
        this.instance.display.updateDisplay();
    }
}
