// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const mediaFixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'media');
export const rejectedMediaFixturePrefix = 'reject-';

export const mediaFixtures = {
    mp4: path.join(mediaFixturesDir, 'valid-video-mp4-sample.mp4'),
    webm: path.join(mediaFixturesDir, 'valid-video-webm-sample.webm'),
    mp3: path.join(mediaFixturesDir, 'valid-audio-mp3-sample.mp3'),
    smallPng: path.join(mediaFixturesDir, 'valid-image-png-small-16x16.png'),
    portraitPng: path.join(mediaFixturesDir, 'valid-image-png-portrait-180x320.png'),
    avif: path.join(mediaFixturesDir, 'valid-image-avif-jupiter-320x320.avif'),
    bmp: path.join(mediaFixturesDir, 'valid-image-bmp-jupiter-320x320.bmp'),
    svg: path.join(mediaFixturesDir, 'valid-image-svg-vector-orbit.svg'),
    unsupportedPdf: path.join(mediaFixturesDir, 'reject-document-pdf-text-tiny-note.pdf'),
    // 20s media for tests that drive playback over several steps; the 1s
    // samples end before a multi-step choreography gets through them.
    longMp4: path.join(mediaFixturesDir, 'valid-video-mp4-thermohaline-landscape-1920x1080-20s.mp4'),
    longMp3: path.join(mediaFixturesDir, 'valid-audio-mp3-nixon-resignation-20s.mp3'),
};

/**
 * @param {keyof typeof mediaFixtures} name
 */
export function mediaFixturePath(name) {
    return mediaFixtures[name];
}
