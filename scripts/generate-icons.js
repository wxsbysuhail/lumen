import sharp from 'sharp';
import path from 'path';

const sourceImgPath = path.resolve('public/logo-concept.png');
const publicDir = path.resolve('public');

async function generate() {
  console.log(`Generating PWA icons from ${sourceImgPath}...`);
  
  // Standard PWA size icons and favicon
  const targets = [
    { size: 32, file: 'favicon.png' },
    { size: 180, file: 'apple-touch-icon.png' },
    { size: 192, file: 'icon-192.png' },
    { size: 512, file: 'icon-512.png' }
  ];

  for (const target of targets) {
    await sharp(sourceImgPath)
      .resize(target.size, target.size)
      .png()
      .toFile(path.join(publicDir, target.file));
    
    console.log(`- Created ${target.file} (${target.size}x${target.size})`);
  }

  // Maskable icons (requires inner padding of about 10-15% to prevent clipping on some devices)
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    const maskableName = `icon-${size}-maskable.png`;
    const innerSize = Math.round(size * 0.7); // 70% size, leaving 15% padding on all sides
    const padding = Math.round((size - innerSize) / 2);
    
    await sharp(sourceImgPath)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 250, g: 250, b: 247, alpha: 1 } // matches #FAFAF7 (var(--bg-color))
      })
      .png()
      .toFile(path.join(publicDir, maskableName));
      
    console.log(`- Created ${maskableName} (${size}x${size}, padded)`);
  }
  
  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
