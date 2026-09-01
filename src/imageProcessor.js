/**
 * imageProcessor.js — Canvas-based image resizing utilities.
 *
 * Single Responsibility: every function here is concerned only with
 * producing a correctly-sized canvas from a source image. No DOM state,
 * no ZIP, no UI.
 */

/**
 * Draw `source` centered and scaled (fit) onto a square canvas of
 * `targetSize` px, filling the background with `bgColor`.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {number} targetSize
 * @param {string} bgColor  CSS color string or 'transparent'
 * @returns {HTMLCanvasElement}
 */
export function resizeCentered(source, targetSize, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    if (bgColor === 'transparent') {
        ctx.clearRect(0, 0, targetSize, targetSize);
    } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetSize, targetSize);
    }

    const sw = source.width;
    const sh = source.height;
    const sa = sw / sh;

    let dw, dh, dx, dy;
    if (sa > 1) {
        dw = targetSize;
        dh = targetSize / sa;
        dx = 0;
        dy = (targetSize - dh) / 2;
    } else {
        dh = targetSize;
        dw = targetSize * sa;
        dx = (targetSize - dw) / 2;
        dy = 0;
    }

    ctx.drawImage(source, dx, dy, dw, dh);
    return canvas;
}

/**
 * Resize `source` to a square canvas of `targetSize` px using a
 * two-step downscale for large sources (avoids aliasing).
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {number} targetSize
 * @param {string} bgColor  CSS color string or 'transparent'
 * @returns {HTMLCanvasElement}
 */
export function resizeImageToSize(source, targetSize, bgColor) {
    const sw = source.width;
    const sh = source.height;

    // Fast path: already the right size
    if (sw === targetSize && sh === targetSize) {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        if (bgColor === 'transparent') {
            ctx.clearRect(0, 0, targetSize, targetSize);
        } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, targetSize, targetSize);
        }
        ctx.drawImage(source, 0, 0);
        return canvas;
    }

    // Multi-step halving for large sources (prevents aliasing)
    let src = source;
    let w = sw;
    let h = sh;
    const maxDim = Math.max(w, h);
    if (maxDim > targetSize * 2) {
        while (w > targetSize * 2 && h > targetSize * 2) {
            const nextW = Math.max(targetSize, Math.floor(w / 2));
            const nextH = Math.max(targetSize, Math.floor(h / 2));
            const temp = document.createElement('canvas');
            temp.width = nextW;
            temp.height = nextH;
            const tctx = temp.getContext('2d');
            tctx.imageSmoothingQuality = 'high';
            tctx.drawImage(src, 0, 0, nextW, nextH);
            src = temp;
            w = nextW;
            h = nextH;
        }
    }

    return resizeCentered(src, targetSize, bgColor);
}

/**
 * Convert a canvas to a PNG Blob.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
}
