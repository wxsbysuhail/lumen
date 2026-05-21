import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImgPath = 'C:/Users/suhail.wohedally/.gemini/antigravity/brain/c051df51-20ab-4243-99af-b0447455bdce/lumen_white_l_icon_1779364308041.png';
const destConceptPath = path.resolve('public/logo-concept.png');
const publicDir = path.resolve('public');

async function generate() {
  console.log(`Copying source icon from ${sourceImgPath} to ${destConceptPath}...`);
  fs.copyFileSync(sourceImgPath, destConceptPath);

  console.log('Trimming the L emblem to remove background margins...');
  // Trim removes pixels of the same color as the corners (which is white)
  const trimmedBuffer = await sharp(destConceptPath)
    .trim()
    .toBuffer();

  console.log('Generating PWA icons with perfect sizing and white background...');

  // Standard target icons
  const standardTargets = [
    { size: 32, file: 'favicon.png' },
    { size: 180, file: 'apple-touch-icon.png' },
    { size: 192, file: 'icon-192.png' },
    { size: 512, file: 'icon-512.png' }
  ];

  for (const target of standardTargets) {
    // For standard icons, let the emblem occupy 65% of the dimensions
    const innerSize = Math.max(1, Math.round(target.size * 0.65));
    const padding = Math.max(0, Math.round((target.size - innerSize) / 2));

    await sharp(trimmedBuffer)
      .resize(innerSize, innerSize, { fit: 'inside' })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // Pure white
      })
      .resize(target.size, target.size) // Make sure dimensions are exact
      .png()
      .toFile(path.join(publicDir, target.file));

    console.log(`- Created ${target.file} (${target.size}x${target.size})`);
  }

  // Maskable target icons
  const maskableTargets = [
    { size: 192, file: 'icon-192-maskable.png' },
    { size: 512, file: 'icon-512-maskable.png' }
  ];

  for (const target of maskableTargets) {
    // For maskable icons, let the emblem occupy 50% of the dimensions
    // to guarantee it fits safely within the 60% circular safe zone on mobile launchers
    const innerSize = Math.max(1, Math.round(target.size * 0.50));
    const padding = Math.max(0, Math.round((target.size - innerSize) / 2));

    await sharp(trimmedBuffer)
      .resize(innerSize, innerSize, { fit: 'inside' })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // Pure white
      })
      .resize(target.size, target.size) // Make sure dimensions are exact
      .png()
      .toFile(path.join(publicDir, target.file));

    console.log(`- Created ${target.file} (${target.size}x${target.size}, maskable)`);
  }

  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
