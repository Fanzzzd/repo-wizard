import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractChangelog } from './extract-latest-changelog.mjs';

const sampleChangelog = `
# [1.9.0](link) (2025-09-09)

### Minor Changes

- Feature A

## 1.8.2

### Patch Changes

- Fix B

## [1.8.1]

- Fix C
`;

test('extracts specific version 1.9.0 with # header', () => {
    const result = extractChangelog(sampleChangelog, '1.9.0');
    assert.ok(result.includes('Feature A'));
    assert.ok(!result.includes('Fix B'));
});

test('extracts specific version 1.8.2 with ## header', () => {
    const result = extractChangelog(sampleChangelog, '1.8.2');
    assert.ok(result.includes('Fix B'));
    assert.ok(!result.includes('Feature A'));
    assert.ok(!result.includes('Fix C'));
});

test('extracts specific version 1.8.1 with ## [version] header', () => {
    const result = extractChangelog(sampleChangelog, '1.8.1');
    assert.ok(result.includes('Fix C'));
});

test('returns null for missing version', () => {
    const result = extractChangelog(sampleChangelog, '2.0.0');
    assert.equal(result, null);
});

test('extracts first version if no version provided', () => {
    const result = extractChangelog(sampleChangelog);
    assert.ok(result.includes('Feature A'));
});
