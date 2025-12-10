// TODO: make sure functionality and JavaScript are as desired.
// Video player controls and UX wiring.
const video = document.getElementById("video");
const playPause = document.getElementById("playPause");
const playOverlay = document.getElementById("playOverlay");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const volume = document.getElementById("volume");
const muteBtn = document.getElementById("mute");
const fullscreenBtn = document.getElementById("fullscreen");
const speed = document.getElementById("speed");
const player = document.getElementById("player");
const rewindBtn = document.getElementById("rewind");
const forwardBtn = document.getElementById("forward");
const overlayPlayIcon = playOverlay.querySelector(".play");
const overlayPauseIcon = playOverlay.querySelector(".pause");

let isDragging = false;
let hideControlsTimeout = null;
const AUTOHIDE_DELAY_MS = 2000;
// Give the progress bar a minimal usable range before metadata loads so dragging works.
progress.max = 1;

// Format seconds into M:SS for display.
const fmt = (t) => {
    if (Number.isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
        .toString()
        .padStart(2, "0");
    return `${m}:${s}`;
};

// Sync play/pause UI for both toolbar and center overlay.
const updatePlayState = () => {
    const isPlaying = !video.paused && !video.ended;
    playPause.querySelector(".play").style.display = isPlaying ? "none" : "block";
    playPause.querySelector(".pause").style.display = isPlaying ? "block" : "none";
    overlayPlayIcon.style.display = isPlaying ? "none" : "block";
    overlayPauseIcon.style.display = isPlaying ? "block" : "none";
    player.querySelector(".video-shell").classList.toggle("paused", !isPlaying);
    if (isPlaying && isFullscreenPlayer()) {
        scheduleHideControls();
    } else {
        clearHideControls();
        player.classList.remove("controls-hidden");
    }
};

// Sync mute UI state.
const updateMuteState = () => {
    const muted = video.muted || video.volume === 0;
    muteBtn.querySelector(".vol").style.display = muted ? "none" : "block";
    muteBtn.querySelector(".muted").style.display = muted ? "block" : "none";
};

// Swap fullscreen icons based on current document fullscreen element.
const updateFullscreenState = () => {
    const isFull = document.fullscreenElement;
    fullscreenBtn.querySelector(".enter").style.display = isFull ? "none" : "block";
    fullscreenBtn.querySelector(".exit").style.display = isFull ? "block" : "none";
};

// Clamp helpers for slider values and derived progress styling.
const getDurationMax = () => {
    if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
    const maxAttr = Number(progress.max);
    return Number.isFinite(maxAttr) && maxAttr > 0 ? maxAttr : 0;
};

const setProgressStyle = () => {
    const max = getDurationMax();
    const val = clampProgressValue(progress.value);
    progress.value = val;
    const percent = max > 0 ? ((Number(val) / max) * 100 || 0) : 0;
    progress.style.setProperty("--progress", `${percent}%`);
};

const clampProgressValue = (val) => {
    const raw = Number(val) || 0;
    const max = getDurationMax();
    return Math.min(Math.max(raw, 0), max);
};

// Fullscreen should apply to the player only, not the whole doc.
const isFullscreenPlayer = () => document.fullscreenElement === player;

// Autohide helpers: only active while playing in fullscreen.
const clearHideControls = () => {
    if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = null;
    }
};

const isVideoActive = () => !video.paused && !video.ended;

const hideControls = () => {
    if (!isVideoActive() || isDragging || !isFullscreenPlayer()) return;
    player.classList.add("controls-hidden");
};

const scheduleHideControls = () => {
    clearHideControls();
    if (!isVideoActive() || isDragging || !isFullscreenPlayer()) return;
    hideControlsTimeout = setTimeout(hideControls, AUTOHIDE_DELAY_MS);
};

const showControlsFromActivity = () => {
    player.classList.remove("controls-hidden");
    if (isFullscreenPlayer()) {
        scheduleHideControls();
    } else {
        clearHideControls();
    }
};

video.addEventListener("loadedmetadata", () => {
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    progress.max = dur;
    progress.value = clampProgressValue(progress.value);
    setProgressStyle();
    durationEl.textContent = fmt(video.duration);
});

video.addEventListener("durationchange", () => {
    const dur = Number.isFinite(video.duration) ? video.duration : getDurationMax();
    progress.max = dur;
    progress.value = clampProgressValue(progress.value);
    setProgressStyle();
});

video.addEventListener("timeupdate", () => {
    const dur = getDurationMax();
    if (Number.isFinite(dur) && dur > 0 && progress.max !== dur) {
        progress.max = dur;
    }
    if (!isDragging) {
        progress.value = clampProgressValue(video.currentTime);
        setProgressStyle();
    }
    currentTimeEl.textContent = fmt(video.currentTime);
});

video.addEventListener("play", updatePlayState);
video.addEventListener("pause", updatePlayState);

const togglePlay = () => {
    video.paused ? video.play() : video.pause();
};

playPause.addEventListener("click", togglePlay);
video.addEventListener("click", () => {
    if (!video.ended) togglePlay();
});

playOverlay.addEventListener("click", togglePlay);

// Scrubbing: live preview while dragging, then seek on release.
progress.addEventListener("input", () => {
    isDragging = true;
    progress.value = clampProgressValue(progress.value);
    currentTimeEl.textContent = fmt(progress.value);
    setProgressStyle();
    player.classList.remove("controls-hidden");
    clearHideControls();
});

progress.addEventListener("change", () => {
    const clamped = clampProgressValue(progress.value);
    progress.value = clamped;
    video.currentTime = clamped;
    isDragging = false;
    scheduleHideControls();
});

volume.addEventListener("input", () => {
    video.volume = volume.value;
    video.muted = volume.value === "0";
    updateMuteState();
});

muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) {
        video.volume = 0.5;
        volume.value = 0.5;
    }
    updateMuteState();
});

fullscreenBtn.addEventListener("click", async () => {
    if (!document.fullscreenElement) {
        await player.requestFullscreen();
    } else {
        await document.exitFullscreen();
    }
    updateFullscreenState();
});

document.addEventListener("fullscreenchange", () => {
    updateFullscreenState();
    showControlsFromActivity();
});

speed.addEventListener("change", () => {
    video.playbackRate = Number(speed.value);
});

rewindBtn.addEventListener("click", () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
});

forwardBtn.addEventListener("click", () => {
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    if (["Space", "KeyK"].includes(e.code)) {
        e.preventDefault();
        video.paused ? video.play() : video.pause();
    }
    if (e.code === "KeyM") {
        muteBtn.click();
    }
    if (e.code === "KeyF") {
        fullscreenBtn.click();
    }
    if (e.code === "ArrowLeft") {
        rewindBtn.click();
    }
    if (e.code === "ArrowRight") {
        forwardBtn.click();
    }
    if (e.code === "KeyJ") {
        video.currentTime = Math.max(0, video.currentTime - 5);
    }
    if (e.code === "KeyL") {
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
    }
    showControlsFromActivity();
});

["mousemove", "click", "touchstart"].forEach((evt) => {
    player.addEventListener(evt, showControlsFromActivity);
});

// Initialisation of player state and UI.
video.volume = 0.7;
volume.value = 0.7;
updatePlayState();
updateMuteState();
setProgressStyle();

