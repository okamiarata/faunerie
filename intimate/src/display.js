function initiateLoad() {
    document.getElementById("corner-loader").style.opacity = "1";
}

function completeLoad() {
    document.getElementById("corner-loader").style.opacity = "0";
}

window.isInDisplay = false;

function loadSlot(url, isVideo) {
    return new Promise((res) => {
        let slot;
        let video;

        if (document.getElementById("display-slot-a").style.opacity === "0") {
            slot = document.getElementById("display-slot-a");
            video = document.getElementById("display-slot-a-video");
        } else {
            slot = document.getElementById("display-slot-b");
            video = document.getElementById("display-slot-b-video");
        }

        setTimeout(() => {
            if (isVideo) {
                slot.style.backgroundImage = "";
                video.src = url;
                video.style.display = "";
                video.oncanplaythrough = () => res();
            } else {
                let img = document.createElement("img");
                img.src = url;
                img.onload = () => {
                    slot.style.backgroundImage = `url("${url.replaceAll('"', '\\"')}")`;
                    video.src = "";
                    video.style.display = "none";
                    res();
                }
            }
        }, 500);
    });
}

function switchSlot() {
    let oldSlot;
    let newSlot;

    if (document.getElementById("display-slot-a").style.opacity === "0") {
        newSlot = document.getElementById("display-slot-a");
        oldSlot = document.getElementById("display-slot-b");
    } else {
        oldSlot = document.getElementById("display-slot-a");
        newSlot = document.getElementById("display-slot-b");
    }

    oldSlot.style.opacity = "0";
    newSlot.style.opacity = "1";
}

function openDisplay() {
    window.isInDisplay = true;
    document.getElementById("display").classList.add("show");
}

function closeDisplay() {
    window.isInDisplay = false;
    document.getElementById("display").classList.remove("show");
    window.close();
}

window.displayQueue = [];
window.lastNextDuration = null;
window.paused = false;
window.nextImageTimeout = null;
window.nextImage = null;

async function startSlideshow(loopVideos = true, refreshFunction = () => {}) {
    window.currentImage = null;
    window.nextImage = window.displayQueue.shift();
    window.updating = false;

    window.doLoadNext = async () => {
        if (window.paused) {
            scheduleNext(lastNextDuration);
            return;
        }

        await loadNextImage();

        if (window.displayQueue.length < 20) {
            if (window.updating) return;
            window.updating = true;
            await refreshFunction();
            window.updating = false;
        }
    }

    function scheduleNext(nextDuration) {
        window.lastNextDuration = nextDuration;

        window.nextImageTimeout = setTimeout(async () => {
            await doLoadNext();
        }, nextDuration);
    }

    window.loadNextImage = async () => {
        clearTimeout(window.nextImageTimeout);

        switchSlot();
        openDisplay();
        await loadSlot(window.nextImage['view_url'], window.nextImage['mime_type'].startsWith("video/"));
        window.currentImage = window.nextImage;

        await new Promise((res) => {
            let s = setInterval(() => {
                clearInterval(s);
                window.nextImage = window.displayQueue.shift();

                if (!!window.nextImage) {
                    clearInterval(s);
                    res();
                }
            });
        })

        let video;

        if (document.getElementById("display-slot-a").style.opacity !== "0") {
            video = document.getElementById("display-slot-a-video");
        } else {
            video = document.getElementById("display-slot-b-video");
        }

        let nextDuration = window.nextImage['mime_type'].startsWith("video/") ? video.duration * 1000 : 7000;

        if (window.nextImage['mime_type'].startsWith("video/")) {
            video.play();

            if (loopVideos) {
                while (nextDuration <= 7000) {
                    nextDuration += video.duration * 1000;
                }
            }
        }

        scheduleNext(nextDuration);
    }

    await loadSlot(window.nextImage['view_url'], window.nextImage['mime_type'].startsWith("video/"));
    window.currentImage = window.nextImage;
    window.nextImage = window.displayQueue.shift();
    await loadNextImage();
}
