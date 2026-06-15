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
    unsupportedPdf: path.join(fixturesDir, 'public-domain', 'negative', 'tiny-note.pdf'),
    // 20s media for tests that drive playback over several steps; the 1s
    // samples end before a multi-step choreography gets through them.
    longMp4: path.join(fixturesDir, 'public-domain', 'thermohaline-landscape-1920x1080-20s.mp4'),
    longMp3: path.join(fixturesDir, 'public-domain', 'nixon-resignation-20s.mp3'),
};

/**
 * @param {keyof typeof mediaFixtures} name
 */
export function mediaFixturePath(name) {
    return mediaFixtures[name];
}
