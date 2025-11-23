const { Manifest, GitHub } = require('release-please');
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN is required');
        }

        const repo = process.env.GITHUB_REPOSITORY;
        const [owner, repoName] = repo.split('/');

        // Initialize GitHub client
        const github = await GitHub.create({
            owner,
            repo: repoName,
            token,
        });

        const configFile = process.env.INPUT_CONFIG_FILE || 'release-please-config.json';
        const manifestFile = process.env.INPUT_MANIFEST_FILE || '.release-please-manifest.json';

        // Run release-please
        // We use the Manifest class to handle monorepos and multiple packages
        const manifest = await Manifest.fromManifest(
            github,
            github.repository.defaultBranch,
            configFile,
            manifestFile
        );

        const pullRequests = await manifest.createPullRequests();
        const releases = await manifest.createReleases();

        // Set outputs for GitHub Actions
        // We need to mimic the outputs of the official action for compatibility
        // The official action sets outputs like:
        // paths_released: JSON string of paths
        // releases_created: true/false
        // <path>--release_created: true/false
        // <path>--id: release id
        // <path>--tag_name: tag name
        // <path>--version: version

        const pathsReleased = [];
        let releasesCreated = false;

        for (const release of releases) {
            if (release) {
                releasesCreated = true;
                const path = release.path || '.';
                pathsReleased.push(path);

                // Set path-specific outputs
                // Note: GitHub Actions outputs must be strings
                // We use core.setOutput if available, or write to GITHUB_OUTPUT
                setOutput(`${path}--release_created`, 'true');
                setOutput(`${path}--id`, release.id);
                setOutput(`${path}--tag_name`, release.tagName);
                setOutput(`${path}--version`, release.version);
                setOutput(`${path}--major`, release.major);
                setOutput(`${path}--minor`, release.minor);
                setOutput(`${path}--patch`, release.patch);
            }
        }

        setOutput('releases_created', releasesCreated ? 'true' : 'false');
        setOutput('paths_released', JSON.stringify(pathsReleased));

        // Also handle PRs if needed, but usually we care about releases for the next steps
        if (pullRequests.length > 0) {
            console.log(`Created ${pullRequests.length} pull requests.`);
        }

    } catch (error) {
        console.error('Error running release-please:', error);
        process.exit(1);
    }
}

function setOutput(key, value) {
    // We used to normalize keys here, but official action supports slashes.
    // So we keep the key as is.

    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    } else {
        console.log(`::set-output name=${key}::${value}`);
    }
}

run();
