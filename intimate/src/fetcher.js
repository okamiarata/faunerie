window.displayIsReady = false;

let testMode = false;

const path = require('path');

// Source: https://stackoverflow.com/a/45130990
const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function getFiles(dir) {
    const subdirs = await readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = resolve(dir, subdir);
        return (await stat(res)).isDirectory() ? getFiles(res) : res;
    }));
    return files.reduce((a, f) => a.concat(f), []);
}

function extToMime(ext) {
    if (ext.startsWith(".")) ext = ext.substring(1);

    switch (ext) {
        case "jpg":
        case "jpe":
        case "jpeg":
        case "jfif":
        case "jif":
        case "jfi":
            return "image/jpeg";

        case "png":
            return "image/png";

        case "webp":
            return "image/webp";

        case "gif":
            return "image/gif";

        case "swf":
            return "application/x-shockwave-flash";

        case "webm":
            return "video/webm";

        case "mp4":
        case "m4v":
        case "mp4v":
            return "video/mp4";
    }
}
// ------------------------------------

async function slideshowMain() {
    console.log("Slideshow: Flushing queue");
    window.displayQueue = [];

    console.log("Slideshow: Displaying loader");
    initiateLoad();

    let pageDerpibooru = 1;
    let pageE621 = 1;
    let pageLocal = 1;
    let seed = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

    console.log(config);

    async function loadNextPageE621() {
        if (!config.modules.e621 || !config._show.e621) return;
        console.log("Slideshow: Loading page " + pageE621 + " from e621");

        let res = await fetch("https://e621.net/posts.json?limit=" + Math.round(50 * config.modules.e621.proportion) + "&tags=order:random%20fav:" + encodeURIComponent(config.modules.e621.source) + "%20rating:" + (testMode ? "q" : "e") + "%20randseed:" + seed + "&page=" + pageE621);
        let json = await res.json();

        if (json["posts"].length === 0 && pageE621 !== 1) {
            console.log("Slideshow: Reached the end of e621, wrapping around");
            pageE621 = 1;
            await loadNextPageE621();
            return;
        }

        json["posts"] = json["posts"].map(i => {
            i["view_url"] = i["file"]["url"];
            i["mime_type"] = extToMime(i["file"]["ext"]);
            i["_source"] = "https://e621.net/posts/" + i["id"];
            return i;
        });

        window.displayQueue.push(...json["posts"]);
        window.displayQueue = window.displayQueue.sort(() => Math.random() - Math.random());
        pageE621++;
    }

    async function loadNextPageDerpibooru() {
        if (!config.modules.derpibooru || !config._show.derpibooru) return;
        console.log("Slideshow: Loading page " + pageDerpibooru + " from Derpibooru");

        let res = await fetch("https://derpibooru.org/api/v1/json/search/images/?q=" + (testMode ? "suggestive" : "explicit") + ",%20faved_by:" + encodeURIComponent(config.modules.derpibooru.source) + "&per_page=" + Math.round(50 * config.modules.derpibooru.proportion) + "&filter_id=56027&sf=random:" + seed + "&page=" + pageDerpibooru);
        let json = await res.json();

        if (json["images"].length === 0 && pageDerpibooru !== 1) {
            console.log("Slideshow: Reached the end of Derpibooru, wrapping around");
            pageDerpibooru = 1;
            await loadNextPageDerpibooru();
            return;
        }

        json["images"] = json["images"].map(i => {
            i["_source"] = "https://derpibooru.org/images/" + i["id"];
            return i;
        });

        window.displayQueue.push(...json["images"]);
        window.displayQueue = window.displayQueue.sort(() => Math.random() - Math.random());
        pageDerpibooru++;
    }

    let fullList;

    if (config.modules.local && config._show.local) {
        fullList = (await getFiles(config.modules.local.source)).filter(i => extToMime(path.extname(i)));
    }

    async function loadNextPageLocal() {
        if (!config.modules.local || !config._show.local) return;
        console.log("Slideshow: Loading page " + pageLocal + " from local filesystem");

        let res = fullList.slice((pageLocal - 1) * Math.round(50 * config.modules.derpibooru.proportion), pageLocal * Math.round(50 * config.modules.derpibooru.proportion));
        let json = {
            images: res.map(i => {
                return {
                    _file: i,
                    id: path.basename(i),
                    mime_type: extToMime(path.extname(i)),
                    view_url: "file://" + encodeURI(i.replaceAll("\\", "/"))
                }
            })
        };

        if (json["images"].length === 0 && pageLocal !== 1) {
            console.log("Slideshow: Reached the end of local filesystem, wrapping around");
            pageLocal = 1;
            await loadNextPageLocal();
            return;
        }

        json["images"] = json["images"].map(i => {
            i["_source"] = i["_file"];
            return i;
        });

        window.displayQueue.push(...json["images"]);
        window.displayQueue = window.displayQueue.sort(() => Math.random() - Math.random());
        pageLocal++;
    }

    console.log("Slideshow: Loading first page");
    await loadNextPageDerpibooru();
    await loadNextPageE621();
    await loadNextPageLocal();

    console.log("Slideshow: Starting slideshow");
    await startSlideshow(false, async () => {
        await loadNextPageDerpibooru();
        await loadNextPageE621();
        await loadNextPageLocal();
    });

    console.log("Slideshow: Removing loader");
    completeLoad();
    window.displayIsReady = true;
}

window.addEventListener("load", () => {
    setTimeout(async () => {
        window.config = await require('electron/renderer').ipcRenderer.invoke("getConfig");
        await slideshowMain();
    }, 1000);
});
