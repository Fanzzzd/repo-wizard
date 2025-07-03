import semanticRelease from 'semantic-release';
import { readFile, appendFile } from 'fs/promises';

async function main() {
  console.log('Starting semantic-release programmatically...');

  const config = JSON.parse(await readFile('.releaserc.json', 'utf-8'));

  const result = await semanticRelease(config, { env: process.env });

  if (result) {
    const { nextRelease, releases } = result;
    console.log(`Release determined: ${nextRelease.type} - ${nextRelease.version}`);

    const githubRelease = releases.find(release => release.pluginName === '@semantic-release/github' && release.id);
    
    const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;

    if (!GITHUB_OUTPUT) {
        console.warn("Not in a GitHub Action environment. Skipping output file generation.");
        if (githubRelease) {
            console.log(`GitHub release ID would be: ${githubRelease.id}`);
        }
        return;
    }

    await appendFile(GITHUB_OUTPUT, `released=true\n`);
    await appendFile(GITHUB_OUTPUT, `tag_name=${nextRelease.gitTag}\n`);

    if (githubRelease) {
      console.log(`Found GitHub release with ID: ${githubRelease.id}`);
      await appendFile(GITHUB_OUTPUT, `release_id=${githubRelease.id}\n`);
    } else {
      console.error("Error: semantic-release ran, but couldn't find a valid GitHub release with an ID.");
      console.error("This might happen if the GitHub publish plugin failed, was skipped, or did not return a release ID.");
      console.error("Full 'releases' array from semantic-release:", JSON.stringify(releases, null, 2));
      process.exit(1);
    }
    console.log("Successfully wrote outputs to GITHUB_OUTPUT.");
  } else {
    console.log('No release published.');
    const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;
    if (GITHUB_OUTPUT) {
        await appendFile(GITHUB_OUTPUT, `released=false\n`);
    }
  }
}

main().catch(err => {
    console.error('The automated release failed:', err);
    process.exit(1);
});
const semanticReleaseModule = require('semantic-release');
const { readFile, appendFile } = require('fs/promises');

// The actual function is likely on the `default` property when required in this context.
// This handles both cases: `module.exports = fn` and `module.exports = { default: fn }`.
const semanticRelease = semanticReleaseModule.default || semanticReleaseModule;

async function main() {
  console.log('Starting semantic-release programmatically...');
  
  if (typeof semanticRelease !== 'function') {
    console.error('Failed to import semantic-release as a function. The imported module is:', semanticReleaseModule);
    process.exit(1);
  }

  const config = JSON.parse(await readFile('.releaserc.json', 'utf-8'));

  const result = await semanticRelease(config, { env: process.env });

  if (result) {
    const { nextRelease, releases } = result;
    console.log(`Release determined: ${nextRelease.type} - ${nextRelease.version}`);

    const githubRelease = releases.find(release => release.pluginName === '@semantic-release/github' && release.id);
    
    const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;

    if (!GITHUB_OUTPUT) {
        console.warn("Not in a GitHub Action environment. Skipping output file generation.");
        if (githubRelease) {
            console.log(`GitHub release ID would be: ${githubRelease.id}`);
        }
        return;
    }

    await appendFile(GITHUB_OUTPUT, `released=true\n`);
    await appendFile(GITHUB_OUTPUT, `tag_name=${nextRelease.gitTag}\n`);

    if (githubRelease) {
      console.log(`Found GitHub release with ID: ${githubRelease.id}`);
      await appendFile(GITHUB_OUTPUT, `release_id=${githubRelease.id}\n`);
    } else {
      console.error("Error: semantic-release ran, but couldn't find a valid GitHub release with an ID.");
      console.error("This might happen if the GitHub publish plugin failed, was skipped, or did not return a release ID.");
      console.error("Full 'releases' array from semantic-release:", JSON.stringify(releases, null, 2));
      process.exit(1);
    }
    console.log("Successfully wrote outputs to GITHUB_OUTPUT.");
  } else {
    console.log('No release published.');
    const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;
    if (GITHUB_OUTPUT) {
        await appendFile(GITHUB_OUTPUT, `released=false\n`);
    }
  }
}

main().catch(err => {
    console.error('The automated release failed:', err);
    process.exit(1);
});