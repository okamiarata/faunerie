const API_ID = require('./credentials.json').id;
const API_KEY = require('./credentials.json').key;
const TOKEN = API_ID + ":" + API_KEY;

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const tags = require('./parsed_tags.json');

if (!process.argv[2]) {
    console.log("Missing operand: please pass the origin database");
    return;
}

console.log("Creating copy...");
fs.copyFileSync(process.argv[2], process.argv[2] + ".work.db");

console.log("Opening database...");
const db = new sqlite3.Database(process.argv[2] + ".work.db");

db.serialize(async () => {
    function sql(q) {
        return new Promise((res, rej) => {
            db.all(q, function (err, data) {
                if (err) {
                    rej(err);
                } else {
                    res(data);
                }
            });
        });
    }

    const list = [];
    let page = 1;
    let lastList = [null];

    function sleep(ms) {
        return new Promise((res) => {
            setTimeout(res, ms);
        });
    }

    process.stdout.write("Gathering items...");

    while (lastList.length > 0) {
        let res = await fetch("https://e621.net/posts.json?page=" + page + "&limit=320&tags=" + encodeURIComponent("fav:" + API_ID), {
            headers: {
                "Authorization": "Basic " + btoa(TOKEN),
                "User-Agent": "Mozilla/5.0 (+Faunerie; https://github.com/equestria-dev/faunerie)"
            }
        });

        let data = (await res.json())["posts"];
        list.push(...data);
        lastList = data;
        page++;

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("Gathering items... " + list.length);

        await sleep(1000);
    }

    function extToMime(ext) {
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

            case "gif":
                return "image/gif";

            case "swf":
                return "application/x-shockwave-flash";

            case "webm":
                return "video/webm"
        }
    }

    function getRatingTag(rating, text) {
        switch (rating) {
            case "s":
                if (text) return "safe";
                return 1040482;

            case "q":
                if (text) return "suggestive";
                return 1043502;

            case "e":
                if (text) return "explicit";
                return 1026707;
        }
    }

    process.stdout.write("\nProcessing images...");
    let i = 0;

    for (let image of list) {
        let data = {
            wilson_score: 0,
            spoilered: false,
            representations: {
                full: image["file"]["url"],
                large: image["file"]["url"],
                medium: image["preview"]["url"],
                small: image["preview"]["url"],
                tall: image["preview"]["url"],
                thumb: image["sample"]["has"] ? image["sample"]["url"] : image["preview"]["url"],
                thumb_small: image["sample"]["has"] ? image["sample"]["url"] : image["preview"]["url"],
                thumb_tiny: image["sample"]["has"] ? image["sample"]["url"] : image["preview"]["url"],
            },
            faves: 0,
            aspect_ratio: image["file"]["width"] / image["file"]["height"],
            duration: image["duration"] ?? 0,
            thumbnails_generated: true,
            tags: [
                getRatingTag(image["rating"], true),
                ...Object.values(image["tags"]).reduce((a, b) => [...a, ...b]).filter(i => tags[i] && tags[i]["derpibooruMatch"]).map(i => tags[i]["derpibooruMatch"][1])
            ],
            created_at: image["created_at"],
            tag_count: 0,
            downvotes: 0,
            id: parseInt("20" + image["id"]),
            source_id: image["id"],
            source: "https://e621.net/posts/%s",
            source_name: "e621",
            name: image["file"]["md5"] + "." + image["file"]["ext"],
            width: image["file"]["width"],
            intensities: {
                ne: 0,
                nw: 0,
                se: 0,
                sw: 0
            },
            orig_sha512_hash: image["file"]["md5"],
            deletion_reason: null,
            processed: true,
            animated: null,
            height: image["file"]["height"],
            description: image["description"],
            sha512_hash: image["file"]["md5"],
            source_urls: image["sources"],
            upvotes: 0,
            source_url: image["sources"][0] ?? null,
            uploader_id: image["uploader_id"],
            score: 0,
            uploader: null,
            first_seen_at: image["created_at"],
            mime_type: extToMime(image["file"]["ext"]),
            duplicate_of: null,
            size: image["file"]["size"],
            comment_count: 0,
            view_url: image["file"]["url"],
            hidden_from_users: false,
            updated_at: image["updated_at"],
            tag_ids: [
                getRatingTag(image["rating"]),
                ...Object.values(image["tags"]).reduce((a, b) => [...a, ...b]).filter(i => tags[i] && tags[i]["derpibooruMatch"]).map(i => parseInt("10" + tags[i]["derpibooruMatch"][0]))
            ],
            format: image["file"]["ext"]
        };

        let readyData = Buffer.from(JSON.stringify(data)).toString("base64");
        await sql("INSERT INTO images VALUES (\"" + readyData + "\")");

        i++;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("Processing images... " + i);
    }

    console.log("\nClosing database...");

    db.close(() => {
        console.log("Done!");
        fs.copyFileSync(process.argv[2] + ".work.db", process.argv[2]);
        fs.unlinkSync(process.argv[2] + ".work.db");
    });
});
