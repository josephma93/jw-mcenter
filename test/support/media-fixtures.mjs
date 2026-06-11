// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'media');

export const mediaFixtures = {
    mp4: path.join(fixturesDir, 'sample.mp4'),
    webm: path.join(fixturesDir, 'sample.webm'),
    mp3: path.join(fixturesDir, 'sample.mp3'),
    smallPng: path.join(fixturesDir, 'small.png'),
    portraitPng: path.join(fixturesDir, 'portrait.png'),
};

/**
 * @param {keyof typeof mediaFixtures} name
 */
export function mediaFixturePath(name) {
    return mediaFixtures[name];
}
