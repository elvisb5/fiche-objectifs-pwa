const fs = require('fs');

// We can create a canvas-like script or SVG with base64 PNG fallback, or generate PNG via sharp
try {
  const sharp = require('sharp');
  sharp('icon-192.svg')
    .resize(180, 180)
    .png()
    .toFile('apple-touch-icon.png')
    .then(() => {
      console.log('Created apple-touch-icon.png');
      return sharp('icon-192.svg').resize(192, 192).png().toFile('icon-192.png');
    })
    .then(() => sharp('icon-192.svg').resize(512, 512).png().toFile('icon-512.png'))
    .then(() => console.log('All PNG icons created successfully!'))
    .catch(err => console.error(err));
} catch (e) {
  console.log('Sharp not installed yet, installing sharp...');
}
