const { parse } = require("csv-parse");
const fs = require('fs');

let tags = [];
let aliases = [];

fs.createReadStream("./tags.csv")
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", (row) => {
        tags.push({
            id: parseInt(row[0]),
            name: row[1],
            category: parseInt(row[2]),
            postCount: parseInt(row[3])
        });
    })
    .on("end", () => {
        fs.writeFileSync("./tags.json", JSON.stringify(tags));
    });

fs.createReadStream("./tag_aliases.csv")
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", (row) => {
        aliases.push({
            id: parseInt(row[0]),
            antecedentName: row[1],
            consequentName: row[2],
            createdAt: new Date(row[3]),
            status: row[4]
        });
    })
    .on("end", () => {
        fs.writeFileSync("./tag_aliases.json", JSON.stringify(aliases));
    });
