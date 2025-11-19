import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PACKAGE_JSON_PATH = join(process.cwd(), 'package.json');
const CARGO_TOML_PATH = join(process.cwd(), 'src-tauri', 'Cargo.toml');
const TAURI_CONF_PATH = join(process.cwd(), 'src-tauri', 'tauri.conf.json');

function main() {
  console.log('Syncing versions...');

  // 1. Read version from package.json
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  const version = packageJson.version;
  console.log(`New version: ${version}`);

  // 2. Update Cargo.toml
  let cargoToml = readFileSync(CARGO_TOML_PATH, 'utf-8');
  // Regex to find the version in the [package] section
  // Assumes [package] is at the top or version is the first "version =" occurrence
  // A safer regex for Cargo.toml [package] version
  const cargoVersionRegex = /^version\s*=\s*"[^"]+"/m;
  
  if (cargoVersionRegex.test(cargoToml)) {
      cargoToml = cargoToml.replace(cargoVersionRegex, `version = "${version}"`);
      writeFileSync(CARGO_TOML_PATH, cargoToml);
      console.log('Updated src-tauri/Cargo.toml');
  } else {
      console.error('Could not find version in src-tauri/Cargo.toml');
      process.exit(1);
  }

  // 3. Update tauri.conf.json
  const tauriConf = JSON.parse(readFileSync(TAURI_CONF_PATH, 'utf-8'));
  if (tauriConf.version) {
      tauriConf.version = version;
      writeFileSync(TAURI_CONF_PATH, JSON.stringify(tauriConf, null, 2));
      console.log('Updated src-tauri/tauri.conf.json');
  } else {
       console.error('Could not find version in src-tauri/tauri.conf.json');
       process.exit(1);
  }
  
  console.log('Version sync complete.');
}

main();
