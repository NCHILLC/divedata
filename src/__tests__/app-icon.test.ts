import fs from 'node:fs';
import path from 'node:path';

// The app icon lives in app.json. Android masks the adaptive icon into its own shape,
// so the foreground is the symbol alone on a transparent canvas and the dark tile
// comes from backgroundColor (docs/design.md background).
const root = path.join(__dirname, '..', '..');
const { expo } = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

// Width, height and color type from a PNG's IHDR chunk.
function png(file: string) {
  const bytes = fs.readFileSync(path.join(root, file));
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

const RGBA = 6;

test('the app icon is a 1024 square PNG', () => {
  expect(png(expo.icon)).toMatchObject({ width: 1024, height: 1024 });
});

test('the Android icon sits on the design background color, not an image', () => {
  const icon = expo.android.adaptiveIcon;
  expect(icon.backgroundColor).toBe('#0e1417');
  expect(icon.backgroundImage).toBeUndefined();
});

test('the Android foreground and monochrome layers are transparent 1024 squares', () => {
  const icon = expo.android.adaptiveIcon;
  for (const file of [icon.foregroundImage, icon.monochromeImage]) {
    expect(png(file)).toEqual({ width: 1024, height: 1024, colorType: RGBA });
  }
});
