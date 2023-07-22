import jQuery from "jquery";
// define & and jQuery on the global window object
Object.assign(window, { $: jQuery, jQuery });

import {initDropArea} from "./drop-area";
import {initMediaPreviewArea, $previewAreaContents} from "./media-preview-area";
import {initMultiScreenPermissionWhenPossible, $multiScreenSupport} from "./multi-screen";
import {combineLatest, filter} from 'rxjs';

function initPresentationControls() {
    combineLatest([$previewAreaContents, $multiScreenSupport])
        .pipe(
            filter(([previewAreaContents]) => previewAreaContents.images.length && previewAreaContents.videos.length)
        )
        .subscribe(() => {
            console.log("Presentation can be enabled!!");
        });
}

$(function onDOMReady() {
    initDropArea();
    initMediaPreviewArea();
    initMultiScreenPermissionWhenPossible();
    initPresentationControls();
});

