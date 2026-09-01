/**
 * uiState.js — DOM references, shared application state, and status helpers.
 *
 * Single Responsibility: own everything that touches the DOM by ID or
 * class query, and provide the mutable state object the app shares.
 * Nothing here decides what to do with events — that belongs to
 * eventHandlers.js.
 */

// ── DOM refs ─────────────────────────────────────────────────────────────────

export const dropZone       = document.getElementById('dropZone');
export const fileInput      = document.getElementById('fileInput');
export const previewArea    = document.getElementById('previewArea');
export const previewImg     = document.getElementById('previewImg');
export const previewName    = document.getElementById('previewName');
export const previewDims    = document.getElementById('previewDims');
export const previewStatus  = document.getElementById('previewStatus');

export const bgColorInput   = document.getElementById('bgColor');
export const colorHex       = document.getElementById('colorHex');
export const bgTransparent  = document.getElementById('bgTransparent');
export const quickBtns      = document.querySelectorAll('.quick-btn');

export const platformIOS     = document.getElementById('platformIOS');
export const platformAndroid = document.getElementById('platformAndroid');
export const platformWeb     = document.getElementById('platformWeb');

export const zipFilename  = document.getElementById('zipFilename');

export const generateBtn  = document.getElementById('generateBtn');
export const downloadBtn  = document.getElementById('downloadBtn');
export const resetBtn     = document.getElementById('resetBtn');

export const progressWrap  = document.getElementById('progressWrap');
export const progressFill  = document.getElementById('progressFill');
export const progressCount = document.getElementById('progressCount');
export const progressLabel = document.getElementById('progressLabel');

export const statusEl = document.getElementById('status');

// ── Mutable application state ─────────────────────────────────────────────────

/**
 * Central mutable state object.
 * Kept in a single place so every module can import and mutate the
 * same reference without needing to pass it down as arguments.
 */
export const state = {
    /** @type {HTMLImageElement|null} */
    sourceImage: null,
    /** @type {File|null} */
    sourceFile: null,
    /** @type {import('jszip')|null} */
    generatedZip: null,
    isGenerating: false,
    isDone: false
};

// ── Status helpers ────────────────────────────────────────────────────────────

/** @param {string} message @param {'info'|'error'|'success'} [type] */
export function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status visible ' + (type || 'info');
}

export function clearStatus() {
    statusEl.className = 'status';
    statusEl.textContent = '';
}

/** @param {string} message */
export function showError(message)   { setStatus(message, 'error'); }

/** @param {string} message */
export function showSuccess(message) { setStatus(message, 'success'); }

/** @param {string} message */
export function showInfo(message)    { setStatus(message, 'info'); }

// ── Background color helper ───────────────────────────────────────────────────

/**
 * Return the current background color selection as a CSS string or
 * 'transparent'.
 *
 * @returns {string}
 */
export function getBgColor() {
    return bgTransparent.checked ? 'transparent' : bgColorInput.value;
}

// ── Platform selection helper ─────────────────────────────────────────────────

/**
 * Return the current platform selection as a plain object.
 *
 * @returns {{ ios: boolean, android: boolean, web: boolean }}
 */
export function getPlatforms() {
    return {
        ios:     platformIOS.checked,
        android: platformAndroid.checked,
        web:     platformWeb.checked
    };
}
