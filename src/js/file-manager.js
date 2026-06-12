// @ts-check
import {
    BehaviorSubject,
    Subject,
    from,
    fromEvent,
    partition,
    buffer,
    filter,
    map,
    mergeMap,
    tap,
} from 'rxjs';
import { moveItemSwapWrap } from './presentation-state.mjs';

/**
 * Media kind detected for a file. Doubles as the EJS template flag name.
 * @typedef {'isImage' | 'isVideo' | 'isAudio'} DetectedMediaType
 */

/**
 * A playlist entry. Playlist order is the array order in {@link filesState$}.
 * @typedef {Object} FileItem
 * @property {number} id
 * @property {File} file
 * @property {string} blobURL
 * @property {DetectedMediaType} detected
 */

/**
 * A candidate file before it is accepted into the playlist.
 * @typedef {Object} FileDescriptor
 * @property {File} file
 * @property {DetectedMediaType | ''} detected Empty string when unsupported.
 */

const IS_IMAGE = 'isImage';
const IS_VIDEO = 'isVideo';
const IS_AUDIO = 'isAudio';

/** @type {JQuery<HTMLElement>} */ let $dropContainer;
/** @type {JQuery<HTMLElement>} */ let $fileList;
/** @type {JQuery<HTMLElement>} */ let $emptyState;
/** @type {JQuery<HTMLElement>} */ let $fileInput;
/** @type {JQuery<HTMLElement>} */ let $selectFilesBtn;
/** @type {JQuery<HTMLElement>} */ let $clearListBtn;
/** @type {JQuery<HTMLElement>} */ let $errorDialog;
/** @type {JQuery<HTMLElement>} */ let $errorList;
/** @type {string} */ let fileItemHTML;

/** @type {BehaviorSubject<FileItem[]>} */
const filesState$ = new BehaviorSubject(/** @type {FileItem[]} */ ([]));
/** @type {Subject<ArrayLike<File>>} */
const intentToAddFiles$ = new Subject();
/** @type {Subject<number>} */
const intentToRemoveFile$ = new Subject();
/** @type {Subject<number>} */
const intentToDuplicateFile$ = new Subject();
/** @type {Subject<void>} */
const intentToClearFiles$ = new Subject();
/** @type {Subject<number>} */
const intentToMoveFileUp$ = new Subject();
/** @type {Subject<number>} */
const intentToMoveFileDown$ = new Subject();
/** @type {Subject<FileDescriptor[]>} */
const unsupportedFiles$ = new Subject();

function initializeDOMThings() {
    $dropContainer = $("#dropContainer");
    $fileList = $("#fileList");
    $emptyState = $("#emptyState");
    $fileInput = $("#fileInput");
    $selectFilesBtn = $("#selectFilesBtn");
    $clearListBtn = $("#clearListBtn");
    $errorDialog = $("#errorDialog");
    $errorList = $("#errorList");
    fileItemHTML = $("#fileItemTemplate").html().trim();

    $fileList.sortable({
        axis: "y",
        containment: "parent",
        cursor: "grabbing",
        forceHelperSize: true,
        forcePlaceholderSize: true,
        handle: ".drag-handle",
        placeholder: "sortable-placeholder",
        scroll: false,
        tolerance: "pointer",
        update() {
            const newOrder = $fileList.children()
                .map((_, el) => $(el).attr("data-index"))
                .get()
                .map(index => parseInt(String(index), 10));
            const currentOrder = filesState$.getValue()
                .map((_, i) => i);
            if (!orderEquals(newOrder, currentOrder)) {
                const newItems = $fileList.children()
                    .map((_, el) => /** @type {FileItem} */ ($(el).data("fileItem")))
                    .get();
                filesState$.next(newItems);
            }
        },
    });

    const dropContainerEl = /** @type {HTMLElement} */ ($dropContainer.get(0));
    fromEvent(dropContainerEl, "dragover").pipe(
        tap(e => {
            e.preventDefault();
            e.stopPropagation();
            $dropContainer.addClass("dragover");
        })
    ).subscribe();

    fromEvent(dropContainerEl, "dragleave").pipe(
        tap(e => {
            e.preventDefault();
            e.stopPropagation();
            $dropContainer.removeClass("dragover");
        })
    ).subscribe();

    fromEvent(dropContainerEl, "drop").pipe(
        tap(e => {
            e.preventDefault();
            e.stopPropagation();
            $dropContainer.removeClass("dragover");
        }),
        map(e => {
            const dragEvent = /** @type {DragEvent} */ (e);
            return dragEvent.dataTransfer ? dragEvent.dataTransfer.files : /** @type {File[]} */ ([]);
        })
    ).subscribe(files => {
        intentToAddFiles$.next(files);
    });

    fromEvent(/** @type {HTMLElement} */ ($fileInput.get(0)), "change").pipe(
        map(e => /** @type {FileList} */ (/** @type {HTMLInputElement} */ (e.target).files))
    ).subscribe(files => {
        intentToAddFiles$.next(files);
        $fileInput.val("");
    });

    fromEvent(/** @type {HTMLElement} */ ($selectFilesBtn.get(0)), "click")
        .subscribe(() => $fileInput.click());

    fromEvent(/** @type {HTMLElement} */ ($clearListBtn.get(0)), "click")
        .subscribe(() => {
            $("<div>¿Estás seguro que deseas vaciar la lista?</div>")
                .dialog({
                    modal: true,
                    title: "Confirmar",
                    buttons: {
                        "Sí": function () {
                            intentToClearFiles$.next();
                            $(this).dialog("close");
                        },
                        "No": function () {
                            $(this).dialog("close");
                        }
                    }
                });
        });

    filesState$
        .subscribe(handleFileListStateChange);

    $fileList.on("click", ".delete-btn", function () {
            const index = parseInt(String($(this).closest(".file-item").attr("data-index")), 10);
            intentToRemoveFile$.next(index);
        })
        .on("click", ".duplicate-btn", function () {
            const index = parseInt(String($(this).closest(".file-item").attr("data-index")), 10);
            intentToDuplicateFile$.next(index);
        })
        .on("click", ".move-up", function (e) {
            e.stopPropagation();
            const index = parseInt(String($(this).closest(".file-item").attr("data-index")), 10);
            intentToMoveFileUp$.next(index);
        })
        .on("click", ".move-down", function (e) {
            e.stopPropagation();
            const index = parseInt(String($(this).closest(".file-item").attr("data-index")), 10);
            intentToMoveFileDown$.next(index);
        });
}

/**
 * @param {number[]} arr1
 * @param {number[]} arr2
 * @returns {boolean}
 */
function orderEquals(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

/**
 * @param {File} file
 * @param {DetectedMediaType} detected
 * @param {string} [providedBlobURL] Reuse an existing blob URL (duplicates).
 * @returns {FileItem}
 */
function createFileItem(file, detected, providedBlobURL) {
    return {
        id: Math.floor(Math.random() * 100000),
        file,
        blobURL: providedBlobURL ?? URL.createObjectURL(file),
        detected,
    };
}

/**
 * @param {File} file
 * @returns {DetectedMediaType | ''} Empty string when the browser can't play it.
 */
function testFileSupportAndDetectType(file) {
    const type = file.type;
    if (type.startsWith("image/")) return IS_IMAGE;
    if (type.startsWith("video/")) {
        const video = document.createElement("video");
        if (!!video.canPlayType && video.canPlayType(type) !== "") return IS_VIDEO;
    }
    if (type.startsWith("audio/")) {
        const audio = document.createElement("audio");
        if (!!audio.canPlayType && audio.canPlayType(type) !== "") return IS_AUDIO;
    }
    return '';
}

/**
 * Re-renders the playlist DOM from state.
 * @param {FileItem[]} newState
 */
function handleFileListStateChange(newState) {
    const frag = document.createDocumentFragment();
    newState.forEach((item, index) => {
        const blobURL = item.blobURL || URL.createObjectURL(item.file);
        const compiledHTML = ejs.render(fileItemHTML, {
            blobURL: blobURL,
            fileType: item.file.type,
            fileName: item.file.name,
            [IS_IMAGE]: false,
            [IS_VIDEO]: false,
            [IS_AUDIO]: false,
            [item.detected]: true,
            id: item.id,
            index: index,
        });
        const $elem = $(compiledHTML);
        $elem.data('fileItem', item);
        $elem.attr('data-index', index);
        frag.appendChild(/** @type {HTMLElement} */ ($elem.get(0)));
    });
    $fileList.empty().append(frag);
    $fileList.sortable("refresh");
    $emptyState.toggle(newState.length === 0);
}

const fileDescriptors$ = intentToAddFiles$.pipe(
    mergeMap(files => from(Array.from(files))),
    map(file => ({ file, detected: testFileSupportAndDetectType(file) }))
);

const [validFiles$, invalidFiles$] = partition(
    fileDescriptors$, descriptor => !!descriptor.detected
);

validFiles$
    .pipe(
        map(descriptor => createFileItem(descriptor.file, /** @type {DetectedMediaType} */ (descriptor.detected))),
        buffer(intentToAddFiles$),
        filter(fileItemsBatch => fileItemsBatch.length > 0)
    )
    .subscribe(fileItemsBatch => {
        const currentItems = filesState$.getValue();
        filesState$.next([...currentItems, ...fileItemsBatch]);
    });

invalidFiles$
    .pipe(
        buffer(intentToAddFiles$),
        filter(invalidNames => invalidNames.length > 0)
    )
    .subscribe(invalidNames => {
        unsupportedFiles$.next(invalidNames);
    });

unsupportedFiles$
    .pipe(
        map(descriptors => descriptors.map(d => d.file.name)),
    )
    .subscribe(fileNames => {
        $errorList.empty().append(fileNames.map(name => $("<li>").text(name)));
        $errorDialog.dialog({
            modal: true,
            maxWidth: 1024
        });
    });



intentToRemoveFile$.subscribe(index => {
    const currentItems = filesState$.getValue();
    if (index >= 0 && index < currentItems.length) {
        currentItems.splice(index, 1);
        filesState$.next([...currentItems]);
    }
});

intentToDuplicateFile$.subscribe(index => {
    const currentItems = filesState$.getValue();
    if (index >= 0 && index < currentItems.length) {
        const originalItem = currentItems[index];
        const duplicatedFile = new File(
            [originalItem.file],
            originalItem.file.name,
            {
                type: originalItem.file.type,
                lastModified: originalItem.file.lastModified
            }
        );
        const duplicatedItem = createFileItem(duplicatedFile, originalItem.detected, originalItem.blobURL);
        const newItems = [...currentItems];
        newItems.splice(index + 1, 0, duplicatedItem);
        filesState$.next(newItems);
    }
});

intentToClearFiles$.subscribe(() => {
    filesState$.next([]);
});

/**
 * Moves a playlist item, wrapping around at the ends.
 * @param {number} index
 * @param {number} delta
 */
function moveFile(index, delta) {
    const currentItems = filesState$.getValue();
    const nextItems = moveItemSwapWrap(currentItems, index, delta);
    if (nextItems.some((item, itemIndex) => item !== currentItems[itemIndex])) {
        filesState$.next(nextItems);
    }
}

intentToMoveFileUp$.subscribe(index => moveFile(index, -1));
intentToMoveFileDown$.subscribe(index => moveFile(index, +1));

export default {
    filesState$,
    unsupportedFiles$,
    initialize: initializeDOMThings,
    /** @param {ArrayLike<File>} files */
    addFiles: (files) => intentToAddFiles$.next(files),
    /** @param {number} index */
    removeFile: (index) => intentToRemoveFile$.next(index),
    clearFiles: () => intentToClearFiles$.next(),
};
