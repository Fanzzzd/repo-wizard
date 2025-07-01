import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const version = process.argv[2];
if (!version) {
  console.error('Error: No version specified!');
  process.exit(1);
}

console.log(`Syncing Tauri config versions to ${version}...`);

async function syncVersions() {
  try {
    // Update src-tauri/Cargo.toml
    const cargoPath = path.join(__dirname, '../src-tauri/Cargo.toml');
    let cargoContent = await fs.readFile(cargoPath, 'utf-8');
    cargoContent = cargoContent.replace(/^(version\s*=\s*)"[^"]+"/, `$1"${version}"`);
    await fs.writeFile(cargoPath, cargoContent);
    console.log(`Updated ${path.basename(cargoPath)} to version ${version}`);

    // Update src-tauri/tauri.conf.json
    const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
    const tauriConf = JSON.parse(await fs.readFile(tauriConfPath, 'utf-8'));
    tauriConf.version = version;
    await fs.writeFile(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
    console.log(`Updated ${path.basename(tauriConfPath)} to version ${version}`);

    console.log('Tauri versions synced successfully.');
  } catch (err) {
    console.error('Failed to sync versions:', err);
    process.exit(1);
  }
}

syncVersions();