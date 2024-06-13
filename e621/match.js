const PATH = require('fs').readFileSync(require('os').homedir() + "/.prisbeam_path").toString().trim();

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(PATH, sqlite3.OPEN_READONLY);
const tags = require('./parsed_tags.json');

const fs = require('fs');

db.serialize(async () => {
    function query(q) {
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

    function sqlstr(str) {
        if (str === null) {
            return "NULL";
        } else {
            return "'" + str.replaceAll("'", "''") + "'";
        }
    }

    let i = 0;
    let success = 0;
    let total = 0;
    let covered = 0;
    let successPerCategory = [0, 0, null, 0, 0, 0, 0, 0, 0];
    let tagsList = Object.entries(tags);

    let done = 0;
    let coverage = 0;
    let matched = 0;

    for (let _tag of tagsList) {
        let name = _tag[0];
        let tag = _tag[1];
        let condition = tag.allowedNames.slice(0, 100).map(i => [i.replaceAll("_", " "), i.replaceAll("_", "+")]).reduce((a, b) => [...a, ...b]).map(i => "name = " + sqlstr(i) + " OR slug = " + sqlstr(i)).join(" OR ");

        let matches = await query("SELECT * FROM tags WHERE name = " + sqlstr(name.replaceAll("_", " ")) + " OR slug = " + sqlstr(name.replaceAll("_", "+")));
        let matchesAlias = await query("SELECT * FROM tags WHERE " + condition);

        let match = null;

        if (matches.length > 0) {
            match = matches[0];
        } else if (matchesAlias.length > 0) {
            match = matchesAlias[0];
        }

        i++;
        total += tag.usage;

        done = (i / tagsList.length) * 100;
        coverage = (covered / total) * 100;
        matched = (success / i) * 100;

        let txt = done.toFixed(2) + "% done - " + coverage.toFixed(2) + "% coverage - " + matched.toFixed(2) + "% matched (" + successPerCategory.map(j => ((j / i) * 100).toFixed(1) + "%").join(", ") + ") - Current: ";

        if (match) {
            tag.derpibooruMatch = [parseInt(match.id.toString().substring(2)), match.name]
            txt += tag.id + " -> " + tag.derpibooruMatch;
            success++;
            successPerCategory[tag.category]++;
            covered += tag.usage;
        } else {
            txt += tag.id + " -> ???";
        }

        txt = txt.substring(0, process.stdout.columns - 1);
        process.stdout.write(txt + " ".repeat(process.stdout.columns - 1 - txt.length));
        process.stdout.cursorTo(0);
    }

    process.stdout.clearLine(null);
    process.stdout.write("Saving to disk...");

    fs.writeFileSync("parsed_tags.json", JSON.stringify(tags, null, 2));
    process.stdout.cursorTo(0);
    console.log("Matching operation completed.");
    console.log("Here is a breakdown:");
    console.log("  * " + success + " tags out of " + i + " (" + matched.toFixed(3) + "%) could be matched successfully.")
    console.log(successPerCategory.map((j, k) => "      * " + ((j / i) * 100).toFixed(3) + "% from category " + k).join("\n"));
    console.log("  * This means that the matched tags cover " + coverage.toFixed(3) + "% of posts on e621, roughly 1 in " + (100 / coverage).toFixed(1) + ".")
});
