async function displayPause() {
    if (!window.displayIsReady) return;
    window.paused = true;

    try {
        await require('electron/renderer').ipcRenderer.invoke("pauseDialog", window.currentImage);
    } catch (e) {
        console.error(e);
    }

    window.paused = false;
}

async function skipImage() {
    if (!window.displayIsReady) return;
    await doLoadNext();
}
