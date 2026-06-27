const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PRESETS = {
    product:    { width: 1200, height: 1600, quality: 85 },
    collection: { width: 1200, height: 900,  quality: 82 },
    hero:       { width: 1920, height: 1080, quality: 80 },
};

const ALLOWED_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif', 'avif']);

async function validateImageBuffer(buffer) {
    const meta = await sharp(buffer).metadata();
    if (!ALLOWED_FORMATS.has(meta.format)) {
        throw Object.assign(new Error('Formato no permitido'), { status: 400 });
    }
    return meta;
}

async function processAndSave(buffer, outputPath, preset = 'product') {
    const { width, height, quality } = PRESETS[preset] || PRESETS.product;
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    await sharp(buffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toFile(outputPath);
}

module.exports = { processAndSave, validateImageBuffer };
