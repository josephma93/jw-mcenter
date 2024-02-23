import jQuery from "jquery";
// define & and jQuery on the global window object
Object.assign(window, { $: jQuery, jQuery });

import {initDropArea} from "./drop-area";
import {initMediaPreviewArea, $previewAreaContents} from "./media-preview-area";
import {initMultiScreenPermissionWhenPossible, $multiScreenSupport} from "./multi-screen";
import {combineLatest, filter, tap} from 'rxjs';

function initPresentationControls() {
    combineLatest([$previewAreaContents, $multiScreenSupport])
        .pipe(
            tap(([a, b]) => console.log(a.hasContent(), b.canUseMultiScreenAPI)),
            filter(([previewAreaContents, multiScreenStatus]) => previewAreaContents.hasContent() && multiScreenStatus.canUseMultiScreenAPI),
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

