/**
 * Derive maskable / logo copies from the canonical 3D app icon.
 *
 * public/app-icon.png is the finished 3D squircle (same sculpture as Sacramento,
 * Buffalo flag blue). Do not rebuild it from notification-icon.png — that
 * flattens the lighting and replaces the black cuffs with a paste-up.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appIconSrc = join(root, 'public', 'app-icon.png');
const maskableDest = join(root, 'public', 'app-icon-maskable.png');
const logoDest = join(root, 'public', 'logo.png');
const downloadDest = join(root, 'public', 'download (6).png');

if (!existsSync(appIconSrc)) {
  throw new Error(`Missing canonical app icon at ${appIconSrc}`);
}

const py = `
from PIL import Image
import shutil

SIZE = 512
BLUE = (0, 51, 141, 255)
MASKABLE_SCALE = 0.72

app_icon_src = ${JSON.stringify(appIconSrc)}
maskable_dest = ${JSON.stringify(maskableDest)}
logo_dest = ${JSON.stringify(logoDest)}
download_dest = ${JSON.stringify(downloadDest)}

popout = Image.open(app_icon_src).convert('RGBA')
bg = Image.new('RGBA', (SIZE, SIZE), BLUE)
nw = nh = int(SIZE * MASKABLE_SCALE)
icon_s = popout.resize((nw, nh), Image.Resampling.LANCZOS)
ox = oy = (SIZE - nw) // 2
bg.paste(icon_s, (ox, oy), icon_s)
bg.save(maskable_dest)
shutil.copy2(app_icon_src, logo_dest)
shutil.copy2(app_icon_src, download_dest)
print(f'Wrote {maskable_dest}')
print(f'Copied logo + download lockup from {app_icon_src}')
`;

execFileSync('python3', ['-c', py], { stdio: 'inherit' });
