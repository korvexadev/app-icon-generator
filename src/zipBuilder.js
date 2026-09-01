/**
 * zipBuilder.js — Orchestrates icon generation and ZIP assembly.
 *
 * Single Responsibility: build the ZIP archive from a source image and
 * the user's selected platforms. Depends on imageProcessor and icoEncoder
 * through ES module imports (Dependency Inversion — depends on
 * abstractions, not on concrete DOM or state).
 *
 * Does not read DOM state directly; all configuration is passed as
 * arguments, keeping this module independently testable.
 */

import { IOS_SPEC, ANDROID_SPEC, WEB_SPEC } from './specs.js';
import { resizeImageToSize, canvasToBlob } from './imageProcessor.js';
import { encodeICO } from './icoEncoder.js';

// ── Derived constants (computed once from specs) ──────────────────────────────

/**
 * Deduplicate an iOS/Mac spec array by expected-size so we only render
 * each unique pixel dimension once.
 */
function getUniqueSizes(spec) {
    const seen = new Set();
    const sizes = [];
    for (const item of spec) {
        const s = Number(item['expected-size']);
        if (!seen.has(s)) {
            seen.add(s);
            sizes.push(s);
        }
    }
    return sizes.sort((a, b) => a - b);
}

const IOS_SIZES = getUniqueSizes(IOS_SPEC);

// Progress totals must reflect the number of files actually written, not
// the number of spec entries (multiple spec entries share the same file).
export const TOTAL_IOS     = IOS_SIZES.length;          // unique PNG files generated
export const TOTAL_ANDROID = ANDROID_SPEC.length;       // one file per density bucket
export const TOTAL_WEB     = WEB_SPEC.length + 1;       // PNGs + favicon.ico

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate the total number of image files that will be generated.
 *
 * @param {{ ios: boolean, android: boolean, web: boolean }} platforms
 * @returns {number}
 */
export function getTotalImages(platforms) {
    let total = 0;
    if (platforms.ios)     total += TOTAL_IOS;
    if (platforms.android) total += TOTAL_ANDROID;
    if (platforms.web)     total += TOTAL_WEB;
    return total;
}

/**
 * Generate all icons and return a populated JSZip instance.
 *
 * @param {HTMLImageElement}  sourceImg
 * @param {string}            bgColor     CSS color or 'transparent'
 * @param {{ ios: boolean, android: boolean, web: boolean }} platforms
 * @param {(done: number, total: number, label: string) => void} onProgress
 * @returns {Promise<InstanceType<typeof JSZip>>}
 */
export async function generateIcons(sourceImg, bgColor, platforms, onProgress) {
    const zip   = new JSZip(); // eslint-disable-line no-undef  (CDN global)
    const total = getTotalImages(platforms);
    let done    = 0;

    function tick(label) {
        done++;
        onProgress(done, total, label);
    }

    // ── iOS ───────────────────────────────────────────────────────────────────
    if (platforms.ios) {
        const iosFolder = zip.folder('Assets.xcassets/AppIcon.appiconset');

        for (const size of IOS_SIZES) {
            const canvas = resizeImageToSize(sourceImg, size, bgColor);
            const blob   = await canvasToBlob(canvas);
            iosFolder.file(size + '.png', blob);
            tick('iOS ' + size + 'px');
        }

        // Contents.json — expected-size values must be strings per Apple spec
        const contentsJson = JSON.stringify(
            IOS_SPEC.map(item => ({
                ...item,
                'expected-size': String(item['expected-size'])
            })),
            null,
            2
        );
        iosFolder.file('Contents.json', contentsJson);
    }

    // ── Android ───────────────────────────────────────────────────────────────
    if (platforms.android) {
        const androidFolder = zip.folder('android');

        for (const spec of ANDROID_SPEC) {
            const canvas = resizeImageToSize(sourceImg, spec.size, bgColor);
            const blob   = await canvasToBlob(canvas);
            androidFolder.folder(spec.folder).file('ic_launcher.png', blob);
            tick('Android ' + spec.size + 'px');
        }
    }

    // ── Web / Favicon ─────────────────────────────────────────────────────────
    if (platforms.web) {
        const webFolder   = zip.folder('web');
        const icoCanvases = [];

        for (const spec of WEB_SPEC) {
            const canvas = resizeImageToSize(sourceImg, spec.size, bgColor);
            const blob   = await canvasToBlob(canvas);
            webFolder.file(spec.filename, blob);

            // Collect 16, 32, 48 px canvases for the multi-res ICO
            if (spec.size === 16 || spec.size === 32 || spec.size === 48) {
                icoCanvases.push({ canvas, size: spec.size });
            }

            tick('Web ' + spec.filename);
        }

        // favicon.ico counts as one extra item (TOTAL_WEB = WEB_SPEC.length + 1)
        if (icoCanvases.length > 0) {
            const icoData = encodeICO(icoCanvases);
            webFolder.file('favicon.ico', icoData);
        }
        tick('favicon.ico');

        const manifest = {
            name: 'App',
            short_name: 'App',
            icons: [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
            ],
            theme_color: '#ffffff',
            background_color: '#ffffff',
            display: 'standalone'
        };
        webFolder.file('site.webmanifest', JSON.stringify(manifest, null, 2));

        // apple-touch-icon also goes at the root of the ZIP
        zip.file(
            'apple-touch-icon.png',
            await canvasToBlob(resizeImageToSize(sourceImg, 180, bgColor))
        );
    }

    // ── Bonus: App Store / Play Store master images ───────────────────────────
    if (platforms.ios || platforms.android) {
        zip.file('appstore.png',  await canvasToBlob(resizeImageToSize(sourceImg, 1024, bgColor)));
        zip.file('playstore.png', await canvasToBlob(resizeImageToSize(sourceImg, 512,  bgColor)));
    }

    onProgress(total, total, 'Done');
    return zip;
}
