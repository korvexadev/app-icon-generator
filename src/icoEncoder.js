/**
 * icoEncoder.js — Binary ICO file encoder.
 *
 * Single Responsibility: given an array of canvas/size pairs, produce
 * a raw Uint8Array that is a valid ICO file. No DOM state, no image
 * loading, no ZIP.
 */

/**
 * Encode one or more square canvases as a multi-resolution ICO file.
 *
 * @param {{ canvas: HTMLCanvasElement, size: number }[]} canvases
 * @returns {Uint8Array}
 */
export function encodeICO(canvases) {
    // ICO header — 6 bytes
    const header = new Uint8Array(6);
    header[0] = 0;
    header[1] = 0;
    header[2] = 1;  // type: icon
    header[3] = 0;
    header[4] = canvases.length & 0xff;
    header[5] = (canvases.length >> 8) & 0xff;

    const dirSize = 16 * canvases.length;
    const dir = new Uint8Array(dirSize);
    const bmpDataArray = [];
    let offset = 6 + dirSize;

    for (let i = 0; i < canvases.length; i++) {
        const { canvas, size } = canvases[i];
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // BMP DIB header (BITMAPINFOHEADER, 40 bytes)
        const rowSize = Math.floor((size * 32 + 31) / 32) * 4;
        const imageSize = rowSize * size;

        const bmpHeader = new Uint8Array(40);
        const view = new DataView(bmpHeader.buffer);
        view.setUint32(0,  40,        true);  // header size
        view.setInt32( 4,  size,      true);  // width
        view.setInt32( 8,  size,      true);  // height (positive = bottom-up)
        view.setUint16(12, 1,         true);  // color planes
        view.setUint16(14, 32,        true);  // bits per pixel
        view.setUint32(16, 0,         true);  // compression (BI_RGB)
        view.setUint32(20, imageSize, true);  // image size
        view.setInt32( 24, 0,         true);  // X pixels/meter
        view.setInt32( 28, 0,         true);  // Y pixels/meter
        view.setUint32(32, 0,         true);  // colors used
        view.setUint32(36, 0,         true);  // important colors

        // Pixel data — BMP is stored bottom-up, BGRA byte order
        const pixelData = new Uint8Array(imageSize);
        for (let y = 0; y < size; y++) {
            const srcY = size - 1 - y;
            for (let x = 0; x < size; x++) {
                const idx    = (srcY * size + x) * 4;
                const dstIdx = y * rowSize + x * 4;
                pixelData[dstIdx]     = data[idx + 2]; // B
                pixelData[dstIdx + 1] = data[idx + 1]; // G
                pixelData[dstIdx + 2] = data[idx];     // R
                pixelData[dstIdx + 3] = data[idx + 3]; // A
            }
        }

        const bmpTotal = new Uint8Array(40 + imageSize);
        bmpTotal.set(bmpHeader, 0);
        bmpTotal.set(pixelData, 40);
        bmpDataArray.push(bmpTotal);

        // Directory entry for this image
        const dirOffset = 6 + i * 16;
        dir[dirOffset]     = size;  // width  (0 = 256)
        dir[dirOffset + 1] = size;  // height (0 = 256)
        dir[dirOffset + 2] = 0;     // color count
        dir[dirOffset + 3] = 0;     // reserved
        dir[dirOffset + 4] = 1;     // color planes
        dir[dirOffset + 5] = 0;
        dir[dirOffset + 6] = 32;    // bits per pixel
        dir[dirOffset + 7] = 0;

        const totalSize = bmpTotal.length;
        dir[dirOffset + 8]  =  totalSize         & 0xff;
        dir[dirOffset + 9]  = (totalSize >> 8)   & 0xff;
        dir[dirOffset + 10] = (totalSize >> 16)  & 0xff;
        dir[dirOffset + 11] = (totalSize >> 24)  & 0xff;
        dir[dirOffset + 12] =  offset             & 0xff;
        dir[dirOffset + 13] = (offset >> 8)       & 0xff;
        dir[dirOffset + 14] = (offset >> 16)      & 0xff;
        dir[dirOffset + 15] = (offset >> 24)      & 0xff;

        offset += totalSize;
    }

    // Assemble final buffer
    const totalBytes = 6 + dirSize + bmpDataArray.reduce((sum, d) => sum + d.length, 0);
    const result = new Uint8Array(totalBytes);
    result.set(header, 0);
    result.set(dir, 6);
    let pos = 6 + dirSize;
    for (const bmp of bmpDataArray) {
        result.set(bmp, pos);
        pos += bmp.length;
    }
    return result;
}
