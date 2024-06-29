import {FaunerieApp} from "./FaunerieApp";
import {FaunerieImageType} from "libfaunerie";
import * as fs from "node:fs";
import {FaunerieUtilities} from "./FaunerieUtilities";
import {shell} from "@electron/remote";

export class FaunerieAppDisplay {
    private instance: FaunerieApp;

    constructor(app: FaunerieApp) {
        this.instance = app;
    }

    runUserSort(a: any, b: any) {
        if ((document.getElementById("sorting") as HTMLInputElement).value === "new") {
            return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
        } else if ((document.getElementById("sorting") as HTMLInputElement).value === "id") {
            return b.id - a.id;
        } else if ((document.getElementById("sorting") as HTMLInputElement).value === "popular") {
            return b.score - a.score;
        } else if ((document.getElementById("sorting") as HTMLInputElement).value === "size") {
            return b.size - a.size;
        } else if ((document.getElementById("sorting") as HTMLInputElement).value === "duration") {
            return b.duration - a.duration;
        } else if ((document.getElementById("sorting") as HTMLInputElement).value === "resolution") {
            return (b.height * b.width) - (a.height * a.width);
        } else if ((document.getElementById("sorting") as HTMLInputElement).value === "relevant") {
            return b.wilson_score - a.wilson_score;
        }
    }

    displayNoResults() {
        document.getElementById("search-warning").style.display = "";
        document.getElementById("pages").style.display = "none";
        document.getElementById("search-warning").innerHTML = "<b>There are no images matching your request.</b> Make sure the selected rating, filters and search query are correct and try again.";
    }

    getThumbnailHTML(i: any) {
        if (i['representations']['thumb'].endsWith(".webm")) i['representations']['thumb'] = i['representations']['thumb'].substring(0, i['representations']['thumb'].length - 5) + ".gif";
        let thumbnail = this.instance.dataStore.database.frontend.getImageFile(i, FaunerieImageType.ThumbnailURL);

        // noinspection CssUnknownTarget
        return `
            <div
                id="image-${i.id}"
                class="
                    image${i.tags.includes('safe') ? ' image-safe' : ''}
                    ${i.tags.includes('questionable') ? ' image-questionable' : ''}
                    ${i.tags.includes('suggestive') ? ' image-suggestive' : ''}
                    ${i.tags.includes('explicit') ? ' image-explicit' : ''}
                    ${i.tags.includes('grimdark') ? ' image-grimdark' : ''}
                "
                style="
                    aspect-ratio: 1;
                    background-color: #333;
                    border-radius: 10px;
                    background-position: center;
                    background-size: contain;
                    background-repeat: no-repeat;
                    cursor: pointer;
                    background-image: url(&quot;${thumbnail}&quot;);
                "
                onclick="instance.display.openImage('${i.id}')"
            ></div>
        `;
    }

    filterEnabledRatings(i: any) {
        return (((document.getElementById("rating-safe") as HTMLInputElement).checked && i.tags.includes("safe")) ||
            ((document.getElementById("rating-suggestive") as HTMLInputElement).checked && i.tags.includes("suggestive")) ||
            ((document.getElementById("rating-questionable") as HTMLInputElement).checked && i.tags.includes("questionable")) ||
            ((document.getElementById("rating-explicit") as HTMLInputElement).checked && i.tags.includes("explicit")) ||
            ((document.getElementById("rating-grimdark") as HTMLInputElement).checked && i.tags.includes("grimdark")))
    }

    getPageNumbers() {
        let _dataStore = this.instance.dataStore;
        let items = _dataStore.currentViewItems;
        let totalPages = Math.ceil(items.length / 50) + 1;
        let pageNumbers = [];

        if (_dataStore.page - 4 > 0) {
            pageNumbers.push(_dataStore.page - 4);
            pageNumbers.push(_dataStore.page - 3);
            pageNumbers.push(_dataStore.page - 2);
            pageNumbers.push(_dataStore.page - 1);
        } else if (_dataStore.page - 3 > 0) {
            pageNumbers.push(_dataStore.page - 3);
            pageNumbers.push(_dataStore.page - 2);
            pageNumbers.push(_dataStore.page - 1);
        } else if (_dataStore.page - 2 > 0) {
            pageNumbers.push(_dataStore.page - 2);
            pageNumbers.push(_dataStore.page - 1);
        } else if (_dataStore.page - 1 > 0) {
            pageNumbers.push(_dataStore.page - 1);
        }

        pageNumbers.push(_dataStore.page);
        let i = 0;

        while (pageNumbers.length < 9) {
            if (_dataStore.page + i + 1 <= totalPages) {
                pageNumbers.push(_dataStore.page + i + 1);
            } else {
                break;
            }

            i++;
        }

        return pageNumbers;
    }

    getPageHTML(page: number) {
        let length = (Math.ceil(this.instance.dataStore.currentViewItems.length / 50) + 1).toString().length;
        return "<code>" + ("0".repeat(length).substring(0, length - page.toString().length) + page.toString()) + "</code>";
    }

    getPageListHTML(pageNumbers: number[]) {
        let _dataStore = this.instance.dataStore;
        let items = _dataStore.currentViewItems;
        let totalPages = Math.ceil(items.length / 50) + 1;

        return `
            <div class="btn-group">
                <span tabindex="-1" onclick="instance.search.viewPage(1);" class="btn btn-primary ${_dataStore.page < 2 ? 'disabled' : ''}">«</span>
                <span tabindex="-1" onclick="instance.search.viewPage(${_dataStore.page - 1});" class="btn btn-primary ${_dataStore.page === 1 ? 'disabled' : ''}">‹</span>
            </div>
            <div class="btn-group">
                ${totalPages > 5 ? pageNumbers.map(i => `
                    <span tabindex="-1" onclick="instance.search.viewPage(${i});" class="btn btn${i !== _dataStore.page ? '-outline' : ''}-primary">${this.getPageHTML(i)}</span>
                `).join("") : Array(totalPages).fill(null).map((_, i) => i + 1).map(i => `
                    <span tabindex="-1" onclick="instance.search.viewPage(${i});" class="btn btn${i !== _dataStore.page ? '-outline' : ''}-primary">${this.getPageHTML(i)}</span>
                `).join("")}
            </div>
            <div class="btn-group">
                <span tabindex="-1" onclick="instance.search.viewPage(${_dataStore.page + 1});" class="btn btn-primary ${_dataStore.page === totalPages ? 'disabled' : ''}">›</span>
                <span tabindex="-1" onclick="instance.search.viewPage(${totalPages as number});" class="btn btn-primary ${_dataStore.page >= totalPages - 1 ? 'disabled' : ''}">»</span>
            </div>
        `;
    }

    updateDisplay() {
        let _dataStore = this.instance.dataStore;
        document.getElementById("search-warning").style.display = "none";

        if (document.getElementById("search-error").style.display === "none") {
            document.getElementById("pages").style.display = "";
        } else {
            document.getElementById("pages").style.display = "none";
        }

        let items = _dataStore.currentViewItems = [..._dataStore.currentView]
            .sort(this.runUserSort)
            .filter(this.filterEnabledRatings)
            .map((i) => this.getThumbnailHTML(i));

        if (items.length === 0 && document.getElementById("search-error").style.display === "none") this.displayNoResults();

        if ((document.getElementById("order") as HTMLInputElement).value === "up") {
            items = items.reverse();
        }

        document.getElementById("images").innerHTML = items.splice((_dataStore.page - 1) * 50, 50).join("");
        document.getElementById("pages").innerHTML = this.getPageListHTML(this.getPageNumbers());

        this.updateTitle();
        this.instance.bootstrapTooltips();
    }

    updateTitle() {
        let _dataStore = this.instance.dataStore;
        let totalPages = Math.ceil(_dataStore.currentViewItems.length / 50) + 1;

        if (_dataStore.searching) {
            if (_dataStore.loadedFromCache) {
                document.title = "Searching for " + (document.getElementById("search") as HTMLInputElement).value.trim() + " (page " + _dataStore.page + "/" + totalPages + ") — Faunerie (Cached)";
            } else {
                document.title = "Searching for " + (document.getElementById("search") as HTMLInputElement).value.trim() + " (page " + _dataStore.page + "/" + totalPages + ") — Faunerie";
            }
        } else {
            if (_dataStore.loadedFromCache) {
                document.title = "All images (page " + _dataStore.page + "/" + totalPages + ") — Faunerie (Cached)";
            } else {
                document.title = "All images (page " + _dataStore.page + "/" + totalPages + ") — Faunerie";
            }
        }
    }

    setRating(rating: string) {
        Array.from(document.querySelectorAll(".tooltip.bs-tooltip-auto")).map(i => i.outerHTML = "");

        (document.getElementById("rating-safe") as HTMLInputElement).checked = false;
        (document.getElementById("rating-questionable") as HTMLInputElement).checked = false;
        (document.getElementById("rating-suggestive") as HTMLInputElement).checked = false;
        (document.getElementById("rating-explicit") as HTMLInputElement).checked = false;
        (document.getElementById("rating-grimdark") as HTMLInputElement).checked = false;

        let code = 0;
        if (rating === "safe") code = 1;
        if (rating === "questionable") code = 2;
        if (rating === "suggestive") code = 3;
        if (rating === "explicit") code = 4;
        if (rating === "grimdark") code = 5;

        if (code >= 1) (document.getElementById("rating-safe") as HTMLInputElement).checked = true;
        if (code >= 2) (document.getElementById("rating-questionable") as HTMLInputElement).checked = true;
        if (code >= 3) (document.getElementById("rating-suggestive") as HTMLInputElement).checked = true;
        if (code >= 4) (document.getElementById("rating-explicit") as HTMLInputElement).checked = true;
        if (code >= 5) (document.getElementById("rating-grimdark") as HTMLInputElement).checked = true;
    }

    highlightZone(id: string, state: boolean) {
        if (state) {
            document.getElementById("preview-zone-" + id).classList.add("hover");
            document.getElementById("preview-tag-zone-" + id).classList.add("hover");
        } else {
            document.getElementById("preview-zone-" + id).classList.remove("hover");
            document.getElementById("preview-tag-zone-" + id).classList.remove("hover");
        }
    }

    buildImageTitle() {
        let _dataStore = this.instance.dataStore;

        return "Image #<span class='selectable'>" +
            (_dataStore.currentImage.source_id ?? _dataStore.currentImage.id) +
            (_dataStore.currentImage.source_name
                ? "</span> (<span class='selectable'>" + _dataStore.currentImage.source_name + "</span>)"
                : "") +
            "" +
            FaunerieUtilities.getMimeBadge(_dataStore.currentImage.mime_type)
    }

    displayImageSize() {
        let _dataStore = this.instance.dataStore;
        let size = 0;
        let sizeExplanation = [];

        let file = _dataStore.database.frontend.getImageFile(_dataStore.currentImage, FaunerieImageType.ViewFile);
        let thumb = _dataStore.database.frontend.getImageFile(_dataStore.currentImage, FaunerieImageType.ThumbnailFile);

        if (file) {
            let cSize = fs.lstatSync(file).size;
            size += cSize;
            sizeExplanation.push("Image: " + FaunerieUtilities.formatSize(cSize));
        }

        if (thumb) {
            let cSize = fs.lstatSync(thumb).size;
            size += cSize;
            sizeExplanation.push("Thumbnail: " + FaunerieUtilities.formatSize(cSize));
        }

        let cSize = JSON.stringify(_dataStore.currentImage).length;
        size += cSize;
        sizeExplanation.push("Metadata: " + FaunerieUtilities.formatSize(cSize));

        document.getElementById("preview-size").innerHTML =
            "<span data-bs-toggle='tooltip' data-bs-html='true' title='" + sizeExplanation.join("<br>") + "'>" +
            FaunerieUtilities.formatSize(size) + "</span>";
    }

    categorySortingNumber(cat: string) {
        if (cat === "error") return 0;
        if (cat === "rating") return 1;
        if (cat === "origin") return 2;
        if (cat === "character") return 3;
        if (cat === "oc") return 4;
        if (cat === "species") return 5;
        if (cat === "body-type") return 6;
        if (cat === "content-official") return 7;
        if (cat === "content-fanmade") return 8;
        if (cat === "spoiler") return 9;
        return 999;
    }

    async getImpliedTags() {
        let _dataStore = this.instance.dataStore;

        let categories = {};
        let implied = [];
        let impliedNames = [];

        for (let id of _dataStore.currentImage.tag_ids) {
            implied.push(...(await _dataStore.database.frontend.getImpliedTagIdsFromId(id)).filter(i => !_dataStore.currentImage.tag_ids.includes(i)));
            impliedNames.push(...(await _dataStore.database.frontend.getImpliedTagNamesFromId(id)).filter(i => !_dataStore.currentImage.tags.includes(i)));
        }

        for (let id of implied) {
            categories[id] = (await _dataStore.database._sql("SELECT category FROM tags WHERE id=" + id))[0]['category'];
        }

        implied = [...new Set(implied)];
        impliedNames = [...new Set(impliedNames)];

        let impliedTags = impliedNames.map((i: string, j: number) => [i, implied[j], categories[implied[j]]]);

        return impliedTags.sort((a, b) => {
            return a[0].localeCompare(b[0]);
        }).sort((a, b) => {
            return this.categorySortingNumber(a[2]) - this.categorySortingNumber(b[2]);
        });
    }

    async getTags() {
        let _dataStore = this.instance.dataStore;
        let categories = {};

        for (let id of _dataStore.currentImage.tag_ids) {
            categories[id] = (await _dataStore.database._sql("SELECT category FROM tags WHERE id=" + id))[0]['category'];
        }

        let tags = _dataStore.currentImage.tags.map((i: string, j: number) => [i, _dataStore.currentImage.tag_ids[j], categories[_dataStore.currentImage.tag_ids[j]]]);

        return tags.sort((a: string, b: string) => {
            return a[0].localeCompare(b[0]);
        }).sort((a: string, b: string) => {
            return this.categorySortingNumber(a[2]) - this.categorySortingNumber(b[2]);
        });
    }

    async displayTags() {
        let tags = await this.getTags();
        let impliedTags = await this.getImpliedTags();

        document.getElementById("preview-tags").innerHTML = tags.map((i: any[]) =>
            "<a class='preview-tag preview-tag-" +
            (i[2] ?? "unknown") +
            "' onclick='instance.search.startTagSearch(decodeURIComponent(atob(\"" + btoa(encodeURIComponent(i[0])) + "\")))'>" +
            i[0] + "</a>"
        ).join("<wbr>") +
        impliedTags.map(i =>
            "<a class='preview-tag preview-tag-implied preview-tag-" +
            (i[2] ?? "unknown") +
            "' onclick='searchForTag(decodeURIComponent(atob(\"" + btoa(encodeURIComponent(i[0])) + "\")))'>" +
            i[0] + "</a>"
        ).join("<wbr>");
    }

    async initializeImageUI(id: string) {
        let _dataStore = this.instance.dataStore;

        _dataStore.modal.show();
        _dataStore.currentImage = await _dataStore.database.frontend.getImage(id);
        _dataStore.currentImageClasses = [];
        document.getElementById("preview-zones").innerHTML = "";

        document.getElementById("preview-parts-loader").style.display = "";
        document.getElementById("preview-parts-none").style.display = "none";
        document.getElementById("preview-parts-unsupported").style.display = "none";
        document.getElementById("preview-parts-list").style.display = "none";
        document.title = "Viewing image #" + (_dataStore.currentImage.source_id ?? id) + " — " + document.title;
        document.getElementById("preview-title").innerHTML = this.buildImageTitle();
        document.getElementById("preview-date").innerHTML = "Uploaded <span data-bs-toggle='tooltip' title='" + new Date(_dataStore.currentImage.created_at * 1000).toString() + "'>" + FaunerieUtilities.timeAgo(_dataStore.currentImage.created_at * 1000) + "</span>";
        document.getElementById("preview-resolution").innerText = _dataStore.currentImage.width + " × " + _dataStore.currentImage.height;
        document.getElementById("preview-source-cta").innerText = "View on " + _dataStore.currentImage.source_name ?? "Derpibooru";
    }

    getCreditDescriptors() {
        let descriptors = {
            artists: [], editors: [], generators: [], photographers: [], prompters: [], colorists: []
        };
        let finalDescriptors = [];

        for (let tag of this.instance.dataStore.currentImage.tags) {
            if (tag.startsWith("artist:")) descriptors.artists.push(tag.substring(7));
            if (tag.startsWith("editor:")) descriptors.editors.push(tag.substring(7));
            if (tag.startsWith("generator:")) descriptors.generators.push(tag.substring(10));
            if (tag.startsWith("photographer:")) descriptors.photographers.push(tag.substring(13));
            if (tag.startsWith("prompter:")) descriptors.prompters.push(tag.substring(9));
            if (tag.startsWith("colorist:")) descriptors.colorists.push(tag.substring(9));
        }

        if (descriptors.artists.length > 0) finalDescriptors.push("artist" + (descriptors.artists.length > 1 ? "s" : "") + ": " + descriptors.artists.join(""));
        if (descriptors.editors.length > 0) finalDescriptors.push("editor" + (descriptors.editors.length > 1 ? "s" : "") + ": " + descriptors.editors.join(""));
        if (descriptors.generators.length > 0) finalDescriptors.push("generator" + (descriptors.generators.length > 1 ? "s" : "") + ": " + descriptors.generators.join(""));
        if (descriptors.photographers.length > 0) finalDescriptors.push("photographer" + (descriptors.photographers.length > 1 ? "s" : "") + ": " + descriptors.photographers.join(""));
        if (descriptors.prompters.length > 0) finalDescriptors.push("prompter" + (descriptors.prompters.length > 1 ? "s" : "") + ": " + descriptors.prompters.join(""));
        if (descriptors.colorists.length > 0) finalDescriptors.push("colorist" + (descriptors.colorists.length > 1 ? "s" : "") + ": " + descriptors.colorists.join(""));

        if (finalDescriptors[0]) finalDescriptors[0] = finalDescriptors[0].substring(0, 1).toUpperCase() + finalDescriptors[0].substring(1);

        return finalDescriptors;
    }

    displayCredits() {
        let _dataStore = this.instance.dataStore;
        let artist = "Anonymous artist";
        let finalDescriptors = this.getCreditDescriptors();
        if (finalDescriptors.length > 0) artist = finalDescriptors.join("; ");

        if (_dataStore.currentImage.tags.includes("official")) {
            if (finalDescriptors.length > 0) {
                artist = finalDescriptors.join("; ") + " (official content)";
            } else {
                artist = "Official Hasbro content";
            }
        }

        if (_dataStore.currentImage.tags.includes("artist needed")) {
            artist = "Unknown artist";
        }

        document.getElementById("preview-artist").innerText = artist;
    }

    displayScore() {
        let _dataStore = this.instance.dataStore;

        if (_dataStore.currentImage.score !== 0) {
            try { document.getElementById("preview-score").outerHTML = ""; } catch (e) {}
            document.getElementById("preview-statistics").insertAdjacentHTML("afterbegin", `<div class="list-group-item" id="preview-score" style="font-weight: bold;"></div>`);

            if (_dataStore.currentImage.faves > 0) {
                document.getElementById("preview-score").innerText = _dataStore.currentImage.faves + " favorites · " + _dataStore.currentImage.score + " points (" + _dataStore.currentImage.upvotes + " up, " + _dataStore.currentImage.downvotes + " down)";
            } else {
                document.getElementById("preview-score").innerText = _dataStore.currentImage.score + " points (" + _dataStore.currentImage.upvotes + " up, " + _dataStore.currentImage.downvotes + " down)";
            }
        } else {
            try { document.getElementById("preview-score").outerHTML = ""; } catch (e) {}
        }
    }

    displayViewer() {
        let _dataStore = this.instance.dataStore;
        let url = _dataStore.database.frontend.getImageFile(_dataStore.currentImage, FaunerieImageType.ViewURL)

        if (_dataStore.currentImage.mime_type.startsWith("video/")) {
            document.getElementById("preview-content").innerHTML = `
                <video id="preview-content-inner" loop muted autoplay controls src="${url}" style="max-width: 100%; max-height: 80vh; margin-left: auto; margin-right: auto; display: block;"></video>
            `;
        } else {
            document.getElementById("preview-content").innerHTML = `
                <img alt="" id="preview-content-inner" src="${url}" style="max-width: 100%; max-height: calc((100vh - 1.75rem * 2) - 71px); margin-left: auto; margin-right: auto; display: block;">
            `;
        }
    }

    async openImage(id: string) {
        await this.initializeImageUI(id);
        this.displayImageSize();
        await this.displayTags();
        this.displayCredits();
        this.displayScore();
        this.displayViewer();
        this.instance.ai.displayClasses(id);
        this.instance.bootstrapTooltips();
    }

    openImageOnSource() {
        let image = this.instance.dataStore.currentImage;
        shell.openExternal(image['source'].replace("%s", image['source_id']));
    }
}
