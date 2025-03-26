import fileManager from './file-manager.js';
import screenManager from './screens-manager.js';
import presentationManager from './presentation-manager.js';

$(function onDOMReady() {
    fileManager.initialize();
    screenManager.initialize();
    presentationManager.initialize(fileManager, screenManager);
});