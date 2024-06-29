import {FaunerieApp} from "./FaunerieApp";
import {BrowserWindow, shell} from "@electron/remote";
import {BrowserWindow as TBrowserWindow, SafeStorage} from "electron";

interface DerpibooruJSDataStore {
    fancyTagEdit: boolean;
    fancyTagUpload: boolean;
    filterId: number;
    hiddenFilter: string;
    hiddenTagList: number[];
    ignoredTagList: number[];
    interactions: any[];
    spoilerType: string;
    spoileredFilter: string;
    spoileredTagList: number[];
    userCanEditFilter: boolean;
    userIsSignedIn: boolean;
    watchedTagList: number[];
}

export class FaunerieDerpibooru {
    instance: FaunerieApp;
    enabled: boolean;
    window: TBrowserWindow;
    dataStore: DerpibooruJSDataStore;

    constructor(instance: FaunerieApp) {
        this.instance = instance;
        this.enabled = null;
    }

    async getDataStore() {
        if (await this.window.webContents.executeJavaScript("!!document.getElementsByClassName(\"js-datastore\")[0]")) {
            let attributes = await this.window.webContents.executeJavaScript("document.getElementsByClassName(\"js-datastore\")[0].getAttributeNames().filter(i => i.startsWith(\"data\"))");
            let obj = {};

            for (let name of attributes) {
                let data = await this.window.webContents.executeJavaScript("document.getElementsByClassName(\"js-datastore\")[0].getAttribute(\"" + name + "\")");

                name = name.substring(5).toLowerCase().replace(/-(.)/g, function(_: string, g: string) {
                    return g.toUpperCase();
                });

                try {
                    obj[name] = JSON.parse(data);
                } catch (e) {
                    obj[name] = data;
                }
            }

            return obj;
        } else {
            return {};
        }
    }

    startLoginFlow() {
        (document.getElementById("derpibooru-email") as HTMLInputElement).value = "";
        (document.getElementById("derpibooru-password") as HTMLInputElement).value = "";
        (document.getElementById("derpibooru-2fa") as HTMLInputElement).value = "";
        document.getElementById("derpibooru-login-2fa").style.display = "none";
        document.getElementById("derpibooru-login-initial").style.display = "";

        this.setFormLock(false);
        this.instance.dataStore.login.show();
    }

    validateEmail(email: string) {
        return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            .test(email.toLowerCase());
    }

    validateCredentials(email: string, password: string) {
        if (email.trim() === "") {
            alert("Please enter an email address.");
            document.getElementById("derpibooru-email").focus();
            return false;
        }

        if (password.trim() === "") {
            alert("Please enter a password.");
            document.getElementById("derpibooru-password").focus();
            return false;
        }

        if (!this.validateEmail(email)) {
            alert("Please enter a valid email address.");
            document.getElementById("derpibooru-email").focus();
            return false;
        }

        if (password.length < 12) {
            alert("Your password must be at least 12 characters.");
            document.getElementById("derpibooru-password").focus();
            return false;
        }

        return true;
    }

    setFormLock(lock: boolean) {
        document.getElementById("login").style['pointerEvents'] = lock ? "none" : "";
        (document.getElementById("derpibooru-email") as HTMLInputElement).disabled = lock;
        (document.getElementById("derpibooru-password") as HTMLInputElement).disabled = lock;
        (document.getElementById("derpibooru-2fa") as HTMLInputElement).disabled = lock;
        document.getElementById("derpibooru-confirm-btn").classList[lock ? "add" : "remove"]("disabled");
        document.getElementById("derpibooru-confirm-btn2").classList[lock ? "add" : "remove"]("disabled");
    }

    async handleLoginPage(email?: string, password?: string) {
        if (this.window.webContents.getURL().endsWith("/sessions/new") ||
            this.window.webContents.getURL().endsWith("/sessions/new/") ||
            this.window.webContents.getURL().endsWith("/sessions") ||
            this.window.webContents.getURL().endsWith("/sessions/")) {
            await this.requestCredentials(email, password);
        } else if (this.window.webContents.getURL().endsWith("/sessions/totp/new") || this.window.webContents.getURL().endsWith("/sessions/totp/new/")) {
            await this.request2fa();
        } else {
            await this.regularLoginItem();
        }
    }

    async requestCredentials(email?: string, password?: string) {
        let msg = await this.window.webContents.executeJavaScript('document.querySelector(".alert.alert-danger")?.innerText');

        if (msg) {
            alert(msg);
            this.setFormLock(false);
            document.getElementById("derpibooru-email").focus();
        } else {
            this.window.webContents.once("did-stop-loading", () => this.handleLoginPage(email, password));

            await this.window.webContents.executeJavaScript("document.getElementById('user_email').value = \"" + email.trim().replaceAll('\\', '\\\\').replaceAll('"', '\\"') + "\";");
            await this.window.webContents.executeJavaScript("document.getElementById('user_password').value = \"" + password.trim().replaceAll('\\', '\\\\').replaceAll('"', '\\"') + "\";");
            await this.window.webContents.executeJavaScript("document.getElementById('user_remember_me').checked = true;");
            await this.window.webContents.executeJavaScript('document.querySelector("[action=\\"/sessions\\"] [type=\\"submit\\"]").click();');
        }
    }

    async request2fa() {
        document.getElementById("derpibooru-login-2fa").style.display = "";
        document.getElementById("derpibooru-login-initial").style.display = "none";
        document.getElementById("derpibooru-2fa").focus();
        this.setFormLock(false);
    }

    async loadUserData() {
        if (!this.dataStore.userIsSignedIn) {
            document.getElementById("derpibooru-login-btn").classList.remove("disabled");
            document.getElementById("derpibooru-login").style.display = "";
            Array.from(document.getElementsByClassName("derpibooru-when-logged-in"))
                .map((i: HTMLElement) => i.style.display = "none");
        } else {
            document.getElementById("derpibooru-login-btn").classList.add("disabled");
            document.getElementById("derpibooru-login").style.display = "none";
            Array.from(document.getElementsByClassName("derpibooru-when-logged-in"))
                .map((i: HTMLElement) => i.style.display = "");

            let avatar = await this.window.webContents
                .executeJavaScript('document.querySelector("[src^=\\"https://derpicdn.net/avatars/\\"]").src');
            await this.instance.propertyStore.setItem("pba_derpibooru_avatar", avatar);
            (document.getElementById("avatar") as HTMLImageElement).src = avatar;

            this.window.webContents.on('did-stop-loading', async () => {
                let apiKey = await this.window.webContents.executeJavaScript('document.getElementById("api-key").innerText.trim();');
                let apiKeyToStore = apiKey;
                let safeStorage: SafeStorage = require('@electron/remote').safeStorage;

                if (safeStorage.isEncryptionAvailable()) {
                    apiKeyToStore = safeStorage.encryptString(apiKey).toString("base64");
                }

                await this.instance.propertyStore.setItem("pba_derpibooru_key_encrypted", apiKeyToStore);

                let userName = await this.window.webContents.executeJavaScript('document.querySelector("[class=\\"header__link\\"][href^=\\"/profiles/\\"]").innerText');
                await this.instance.propertyStore.setItem("pba_derpibooru_user_name", userName);
                document.getElementById("user-name").innerText = "Logged in as: " + userName;
            });

            await this.window.loadURL("https://derpibooru.org/registrations/edit");
        }
    }

    openManager() {
        shell.openExternal("https://derpibooru.org/registrations/edit");
    }

    async logOut() {
        if (confirm("Are you sure you want to log out from Derpibooru? Any features using Derpibooru will stop working and your Derpibooru user data will be removed from Faunerie.")) {
            await this.instance.propertyStore.removeItem("pba_derpibooru_user_name");
            await this.instance.propertyStore.removeItem("pba_derpibooru_key_encrypted");
            await this.instance.propertyStore.removeItem("pba_derpibooru_avatar");
            await this.window.webContents.executeJavaScript('document.querySelector("[data-method=\\"delete\\"][href=\\"/sessions\\"]").click();');
            location.reload();
        }
    }

    async regularLoginItem() {
        if ((await this.getDataStore() as DerpibooruJSDataStore).userIsSignedIn) {
            this.setFormLock(false);
            this.instance.dataStore.login.hide();
            location.reload();
        } else {
            if (document.getElementById("derpibooru-login-2fa").style.display !== "none") {
                alert("An invalid two-factor authentication code was entered. Please try again.");
                (document.getElementById("derpibooru-2fa") as HTMLInputElement).value = "";
                (document.getElementById("derpibooru-email") as HTMLInputElement).value = "";
                (document.getElementById("derpibooru-password") as HTMLInputElement).value = "";
                this.setFormLock(false);
            }

            document.getElementById("derpibooru-login-2fa").style.display = "none";
            document.getElementById("derpibooru-login-initial").style.display = "";
        }
    }

    submitLogin() {
        let email = (document.getElementById("derpibooru-email") as HTMLInputElement).value;
        let password = (document.getElementById("derpibooru-password") as HTMLInputElement).value;
        if (!this.validateCredentials(email, password)) return;

        this.setFormLock(true);
        this.window.webContents.once("did-stop-loading", () => this.handleLoginPage(email, password));

        this.window.loadURL("https://derpibooru.org/sessions/new");
    }

    async submit2fa() {
        let mfa = parseInt((document.getElementById("derpibooru-2fa") as HTMLInputElement).value).toString();
        if (mfa.length !== 6) {
            alert("A two-factor authentication code contains 6 digits, but you entered " + mfa.length + ".");
            document.getElementById("derpibooru-2fa").focus();
            return;
        }

        this.setFormLock(true);
        this.window.webContents.once("did-stop-loading", () => this.handleLoginPage(null, null));
        await this.window.webContents.executeJavaScript("document.getElementById('user_twofactor_token').value = \"" + mfa.trim().replaceAll('\\', '\\\\').replaceAll('"', '\\"') + "\";");
        await this.window.webContents.executeJavaScript("document.getElementById('user_remember_me').checked = true;");
        await this.window.webContents.executeJavaScript('document.querySelector("[action=\\"/sessions/totp\\"] [type=\\"submit\\"]").click();');
    }

    initialize() {
        document.getElementById("login").addEventListener("shown.bs.modal", () => {
            if (this.window.webContents.getURL().endsWith("/sessions/totp/new") || this.window.webContents.getURL().endsWith("/sessions/totp/new/")) {
                document.getElementById("derpibooru-login-2fa").style.display = "";
                document.getElementById("derpibooru-login-initial").style.display = "none";
                document.getElementById("derpibooru-2fa").focus();
            } else {
                document.getElementById("derpibooru-login-2fa").style.display = "none";
                document.getElementById("derpibooru-login-initial").style.display = "";
                document.getElementById("derpibooru-email").focus();
            }
        });

        document.getElementById("derpibooru-email").onkeydown = document.getElementById("derpibooru-password").onkeydown = (event) => {
            if (event.key === "Enter") {
                this.submitLogin();
            }
        }

        document.getElementById("derpibooru-2fa").onkeydown = (event) => {
            if (event.key === "Enter") {
                this.submit2fa();
            }
        }

        document.getElementById("avatar").onerror = () => {
            (document.getElementById("avatar") as HTMLImageElement).src = "../logo/placeholder.jpg";
        }

        return new Promise<void>(async (res) => {
            this.enabled = false;

            this.window = new BrowserWindow({
                show: false
            });

            await this.window.loadURL("https://derpibooru.org");

            this.dataStore = await this.getDataStore() as DerpibooruJSDataStore;
            await this.loadUserData();
            this.enabled = true;

            this.window.webContents.on('did-stop-loading', async () => {
                this.dataStore = await this.getDataStore() as DerpibooruJSDataStore;
                if (!this.dataStore.userIsSignedIn) await this.loadUserData();
            });

            res();
        })
    }
}
