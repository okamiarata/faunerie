const fs = require('fs');

let tags = require('./tags.json');
let aliases = require('./tag_aliases.json');
let final = {};

for (let tag of tags) {
    final[tag.name] = {
        id: tag.id,
        allowedNames: [tag.name],
        usage: tag.postCount,
        category: tag.category,
        derpibooruMatch: null
    }
}

for (let alias of aliases) {
    if (alias.status === "deleted" || alias.status === "pending") continue;

    try {
        let aliasedTag = final[alias.consequentName];
        aliasedTag.allowedNames.push(alias.antecedentName);
    } catch (e) {
        console.error(e);
        console.log(alias);
        return;
    }
}

fs.writeFileSync("parsed_tags.json", JSON.stringify(final, null, 2));
