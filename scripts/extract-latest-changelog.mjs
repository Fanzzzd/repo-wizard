import { readFileSync } from 'fs';
import { join } from 'path';

const CHANGELOG_PATH = join(process.cwd(), 'CHANGELOG.md');

export function extractChangelog(content, version) {
    let regex;
    if (version) {
        // Match a specific version header.
        // Supports:
        // # [1.9.0]...
        // ## 1.9.0
        // ## [1.9.0]...
        // The lookahead ensures we stop at the next header of level 1 or 2.
        const escapedVersion = version.replace(/\./g, '\\.');
        regex = new RegExp(`(?:^|\\n)#{1,2}\\s+(?:\\[?${escapedVersion}\\]?).*\\r?\\n([\\s\\S]*?)(?=\\r?\\n#{1,2}\\s+|$)`);
    } else {
        // Fallback: Match the first level 1 or 2 header that looks like a version
        // This is a bit more aggressive to catch the first entry.
        regex = /(?:^|\n)#{1,2}\s+(?:\[?v?\d+\.\d+\.\d+(?:-[\w\.]+)?\]?).*\r?\n([\s\S]*?)(?=\r?\n#{1,2}\s+|$)/;
    }

    const match = content.match(regex);
    return match && match[1] ? match[1].trim() : null;
}

function main() {
    // Only run if executed directly
    if (process.argv[1] === import.meta.filename) {
        try {
            const content = readFileSync(CHANGELOG_PATH, 'utf-8');
            const version = process.argv[2]; // Optional version argument

            const changelog = extractChangelog(content, version);

            if (changelog) {
                // GitHub Actions output multiline strings need special handling
                // https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#multiline-strings
                const delimiter = `EOF_${Date.now()}`;
                console.log(`changelog<<${delimiter}`);
                console.log(changelog);
                console.log(delimiter);
            } else {
                console.warn('No changelog entry found.');
                console.log('changelog=');
            }
        } catch (error) {
            console.error('Error reading CHANGELOG.md:', error);
            process.exit(1);
        }
    }
}

main();
