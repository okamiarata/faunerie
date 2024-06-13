window.onkeydown = (e) => {
    console.log(e);
    if (e.code === "Space") displayPause();
    if (e.code === "Enter") displayPause();
    if (e.code === "NumPadEnter") displayPause();

    if (e.code === "ArrowLeft") skipImage();
    if (e.code === "ArrowRight") skipImage();
    if (e.code === "ArrowUp") skipImage();
    if (e.code === "ArrowDown") skipImage();
}
