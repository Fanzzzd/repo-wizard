import { readFileSync } from 'fs';
import { join } from 'path';

const CHANGELOG_PATH = join(process.cwd(), 'CHANGELOG.md');

function main() {
    try {
        const content = readFileSync(CHANGELOG_PATH, 'utf-8');
        // Match the first level 2 header (version) and capture everything until the next level 2 header
        // Example:
        // ## 1.8.1
        // ... content ...
        // ## 1.8.0
        const regex = /^##\s+.*?\n([\s\S]*?)(?=\n##\s+|$)/;
        const match = content.match(regex);

        if (match && match[1]) {
            const changelog = match[1].trim();
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

main();
