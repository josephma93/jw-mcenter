import jQuery from "jquery";
// define $ and jQuery on the global window object
Object.assign(window, { $: jQuery, jQuery });

import {initDropArea} from "./drop-area";
import {initMediaPreviewArea} from "./media-preview-area";
import {initMultiScreenPermissionWhenPossible} from "./multi-screen";
import {initPresentationControls} from "./presentation-controls";

$(function onDOMReady() {
    initDropArea();
    initMediaPreviewArea();
    initMultiScreenPermissionWhenPossible();
    initPresentationControls();
});

