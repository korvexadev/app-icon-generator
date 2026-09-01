/**
 * eventHandlers.js — User action handlers.
 *
 * Single Responsibility: respond to user actions (generate, download,
 * reset, load image). Reads and writes DOM state only through uiState,
 * and delegates computation to zipBuilder / imageProcessor.
 *
 * None of these functions are attached to the DOM directly here; that
 * belongs to main.js (Open/Closed Principle — adding a new action
 * means a new handler + one line in main.js, nothing else changes).
 */

import {
    state,
    generateBtn, downloadBtn, progressWrap,
    progressFill, progressCount, progressLabel,
    previewArea, previewImg, previewName, previewDims,
    previewStatus, fileInput, zipFilename,
    clearStatus, showError, showSuccess, showInfo,
    getBgColor, getPlatforms
} from './uiState.js';

import { generateIcons, getTotalImages } from './zipBuilder.js';

// ── Generate ──────────────────────────────────────────────────────────────────

export async function handleGenerate() {
    if (!state.sourceImage || state.isGenerating) return;

    const platforms = getPlatforms();
    const total     = getTotalImages(platforms);

    if (total === 0) {
        showError('Please select at least one platform.');
        return;
    }

    // — Set generating state —
    state.isGenerating = true;
    state.isDone = false;

    generateBtn.disabled = true;
    generateBtn.classList.add('generating');
    generateBtn.querySelector('.btn-label').textContent = 'Generating';

    downloadBtn.disabled = true;

    progressWrap.classList.add('visible');
    progressFill.style.width = '0%';
    progressCount.textContent = '0 / ' + total;
    progressLabel.textContent = 'Starting';

    clearStatus();
    showInfo('Generating ' + total + ' icons');

    try {
        const zip = await generateIcons(
            state.sourceImage,
            getBgColor(),
            platforms,
            (done, tot, label) => {
                const pct = Math.min(100, Math.round((done / tot) * 100));
                progressFill.style.width = pct + '%';
                progressCount.textContent = done + ' / ' + tot;
                progressLabel.textContent = label;
            }
        );

        state.generatedZip = zip;
        state.isDone = true;

        generateBtn.classList.remove('generating');
        generateBtn.classList.add('done');
        generateBtn.querySelector('.btn-label').textContent = 'Done';

        downloadBtn.disabled = false;
        showSuccess('All ' + total + ' icons generated');

    } catch (err) {
        console.error(err);
        showError('Generation failed: ' + err.message);
        generateBtn.classList.remove('generating');
        generateBtn.querySelector('.btn-label').textContent = 'Generate Icons';

    } finally {
        state.isGenerating = false;
        generateBtn.disabled = false;
    }
}

// ── Download ──────────────────────────────────────────────────────────────────

export function handleDownload() {
    if (!state.generatedZip) return;

    const name      = zipFilename.value.trim() || 'AppIcon-icons';
    const finalName = name.endsWith('.zip') ? name : name + '.zip';

    state.generatedZip
        .generateAsync({ type: 'blob' })
        .then(function (blob) {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = finalName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(function (err) {
            console.error(err);
            showError('Download failed: ' + err.message);
        });
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export function handleReset() {
    state.sourceImage  = null;
    state.sourceFile   = null;
    state.generatedZip = null;
    state.isGenerating = false;
    state.isDone       = false;

    previewArea.classList.remove('visible');
    previewImg.src        = '';
    previewName.textContent = '';
    previewDims.textContent = '';
    fileInput.value = '';

    generateBtn.disabled = true;
    generateBtn.classList.remove('generating', 'done');
    generateBtn.querySelector('.btn-label').textContent = 'Generate Icons';

    downloadBtn.disabled = true;

    progressWrap.classList.remove('visible');
    progressFill.style.width       = '0%';
    progressCount.textContent      = '0 / 0';
    progressLabel.textContent      = 'Processing';

    clearStatus();
    showInfo('Ready — drop an image to start');
    zipFilename.value = 'AppIcon-image.zip';
}

// ── Load image from File ──────────────────────────────────────────────────────

/**
 * Read a File object, decode it as an image, and update state + preview.
 *
 * @param {File} file
 */
export function loadImageFromFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        showError('Please select a valid image file.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = new Image();

        img.onload = function () {
            state.sourceImage = img;
            state.sourceFile  = file;

            // Update zip filename to match the loaded file
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
            zipFilename.value = 'AppIcon-' + baseName + '.zip';

            previewImg.src              = e.target.result;
            previewName.textContent     = file.name;
            previewDims.textContent     = img.width + ' × ' + img.height + ' px';
            previewArea.classList.add('visible');

            const isSquare = Math.abs(img.width - img.height) < 1;
            if (!isSquare) {
                previewStatus.textContent = 'centered · not square';
                previewStatus.className   = 'preview-status warning';
                showInfo('Image will be centered on a square canvas with the selected background.');
            } else {
                previewStatus.textContent = 'square';
                previewStatus.className   = 'preview-status';
                clearStatus();
                showInfo('Image loaded — ready to generate.');
            }

            generateBtn.disabled = false;
            downloadBtn.disabled = true;
            state.generatedZip   = null;
            state.isDone         = false;
            generateBtn.classList.remove('done', 'generating');
            generateBtn.querySelector('.btn-label').textContent = 'Generate Icons';
        };

        img.onerror = function () {
            showError('Failed to decode image. Try a different file.');
        };

        img.src = e.target.result;
    };

    reader.onerror = function () {
        showError('Failed to read file.');
    };

    reader.readAsDataURL(file);
}
