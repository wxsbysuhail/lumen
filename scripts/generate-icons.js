import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/favicon.svg');
const publicDir = path.resolve('public');

const sizes = [192, 512, 180]; // 192, 512 for Android/manifest, 180 for Apple-touch-icon

async function generate() {
  console.log('Generating PWA icons from favicon.svg...');
  
  for (const size of sizes) {
    let outputName = `icon-${size}.png`;
    if (size === 180) {
      outputName = 'apple-touch-icon.png';
    }
    
    // Standard icon
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, outputName));
    
    console.log(`- Created ${outputName}`);
    
    // Maskable icons (requires inner padding of about 10-15% to prevent clipping on some devices)
    if (size === 192 || size === 512) {
      const maskableName = `icon-${size}-maskable.png`;
      const innerSize = Math.round(size * 0.7); // 70% size, leaving 15% padding on all sides
      const padding = Math.round((size - innerSize) / 2);
      
      await sharp(svgPath)
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
        
      console.log(`- Created ${maskableName}`);
    }
  }
  
  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
