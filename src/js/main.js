// @ts-check
import $ from 'jquery';
import fileManager from './file-manager.js';
import screenManager from './screens-manager.js';
import presentationManager from './presentation-manager.js';
import configManager from './config-manager.js';
import { registerControlServiceWorker } from './pwa-registration.js';

$(async function onDOMReady() {
    registerControlServiceWorker();
    fileManager.initialize();
    screenManager.initialize();
    // Await config so the stored blank-screen image is rehydrated before the
    // presentation controls go live: a fast "start presentation" right after
    // reload then shows the configured image instead of flashing true-blank.
    await configManager.initialize();
    presentationManager.initialize(fileManager, screenManager, configManager);
});
