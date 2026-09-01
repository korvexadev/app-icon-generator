/**
 * main.js — Application entry point.
 *
 * Single Responsibility: bind DOM events to handlers and run the initial
 * setup. Nothing else belongs here.
 *
 * Open/Closed: adding a new feature means adding a new handler in
 * eventHandlers.js and one addEventListener call here — no existing code
 * needs to change.
 */

import {
    dropZone, fileInput,
    bgColorInput, colorHex, bgTransparent, quickBtns,
    platformIOS, platformAndroid, platformWeb,
    generateBtn, downloadBtn, resetBtn,
    state, clearStatus, showError, showInfo
} from './uiState.js';

import {
    handleGenerate,
    handleDownload,
    handleReset,
    loadImageFromFile
} from './eventHandlers.js';

// ── Surface any unhandled module errors in the status bar ─────────────────────

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    showError('Unexpected error: ' + (e.reason?.message || e.reason));
});

// ── File input ────────────────────────────────────────────────────────────────

fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadImageFromFile(file);
});

// ── Drag and drop ─────────────────────────────────────────────────────────────

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files[0]) {
        loadImageFromFile(files[0]);
        // Keep fileInput in sync so the change event fires correctly next time
        try {
            const dt = new DataTransfer();
            dt.items.add(files[0]);
            fileInput.files = dt.files;
        } catch (_) { /* DataTransfer not available in all environments */ }
    }
});

// ── Background color ──────────────────────────────────────────────────────────

bgColorInput.addEventListener('input', (e) => {
    colorHex.textContent = e.target.value;
    bgTransparent.checked = false;
    quickBtns.forEach(btn => btn.classList.remove('active'));
});

bgTransparent.addEventListener('change', (e) => {
    if (e.target.checked) {
        quickBtns.forEach(btn => btn.classList.remove('active'));
    }
});

quickBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
        // Prevent any potential event propagation to the drop zone
        e.stopPropagation();
        const color = btn.dataset.color;
        bgColorInput.value    = color;
        colorHex.textContent  = color;
        bgTransparent.checked = false;
        quickBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ── Platform checkboxes ───────────────────────────────────────────────────────

[platformIOS, platformAndroid, platformWeb].forEach((el) => {
    el.addEventListener('change', () => {
        // Changing platforms after generation invalidates the current ZIP
        if (state.isDone) {
            state.isDone       = false;
            state.generatedZip = null;
            generateBtn.classList.remove('done');
            generateBtn.querySelector('.btn-label').textContent = 'Generate Icons';
            downloadBtn.disabled = true;
        }
    });
});

// ── Action buttons ────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', handleGenerate);
downloadBtn.addEventListener('click', handleDownload);
resetBtn.addEventListener('click', handleReset);

// ── Init ──────────────────────────────────────────────────────────────────────

(function init() {
    // Do not call showInfo('') — it makes the status bar visible with no text.
    // Leave the status bar hidden until there is something to say.
    clearStatus();

    // Sync hex display with the initial color picker value
    colorHex.textContent = bgColorInput.value;

    if (typeof JSZip === 'undefined') { // eslint-disable-line no-undef
        showError('JSZip library failed to load. Check your internet connection.');
        return;
    }

    showInfo('Drop an image or click the zone above to get started.');
})();
