import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fullVersion = process.argv[2];
if (!fullVersion) {
  console.error('Error: No version specified!');
  process.exit(1);
}

// For MSI compatibility, tauri config versions should not contain pre-release identifiers.
// e.g. 1.1.0-next.2 -> 1.1.0
const tauriVersion = fullVersion.split('-')[0];

console.log(`Full version for release: ${fullVersion}`);
console.log(`Syncing Tauri config versions to ${tauriVersion}...`);

async function syncVersions() {
  try {
    // Update src-tauri/Cargo.toml
    const cargoPath = path.join(__dirname, '../src-tauri/Cargo.toml');
    let cargoContent = await fs.readFile(cargoPath, 'utf-8');
    cargoContent = cargoContent.replace(/^(\s*version\s*=\s*)"[^"]+"/m, `$1"${tauriVersion}"`);
    await fs.writeFile(cargoPath, cargoContent);
    console.log(`Updated ${path.basename(cargoPath)} to version ${tauriVersion}`);

    // Update src-tauri/tauri.conf.json
    const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
    const tauriConf = JSON.parse(await fs.readFile(tauriConfPath, 'utf-8'));
    tauriConf.version = tauriVersion;
    await fs.writeFile(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
    console.log(`Updated ${path.basename(tauriConfPath)} to version ${tauriVersion}`);

    console.log('Tauri versions synced successfully.');
  } catch (err) {
    console.error('Failed to sync versions:', err);
    process.exit(1);
  }
}

syncVersions();