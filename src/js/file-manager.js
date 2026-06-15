// @ts-check
import {
    BehaviorSubject,
    Subject,
    fromEvent,
    map,
    mergeMap,
    tap,
} from 'rxjs';
import Sortable from 'sortablejs';
import {
    IS_AUDIO,
    IS_IMAGE,
    IS_VIDEO,
    detectImportableMediaType,
} from './media-import-validation.mjs';
import { moveItemSwapWrap } from './presentation-state.mjs';

/**
 * @typedef {import('./media-import-validation.mjs').DetectedMediaType} DetectedMediaType
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

/** @type {JQuery<HTMLElement>} */ let $dropContainer;
/** @type {JQuery<HTMLElement>} */ let $fileList;
/** @type {JQuery<HTMLElement>} */ let $emptyState;
/** @type {JQuery<HTMLElement>} */ let $playlistCount;
/** @type {JQuery<HTMLElement>} */ let $fileInput;
/** @type {JQuery<HTMLElement>} */ let $selectFilesBtn;
/** @type {JQuery<HTMLElement>} */ let $clearListBtn;
/** @type {JQuery<HTMLElement>} */ let $errorList;
/** @type {HTMLDialogElement} */ let clearListDialog;
/** @type {HTMLDialogElement} */ let errorDialog;
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
/** @type {Subject<number>} */
const intentToShowFile$ = new Subject();
/** @type {Subject<FileDescriptor[]>} */
const unsupportedFiles$ = new Subject();

function initializeDOMThings() {
    $dropContainer = $("#dropContainer");
    $fileList = $("#fileList");
    $emptyState = $("#emptyState");
    $playlistCount = $("#playlistCount");
    $fileInput = $("#fileInput");
    $selectFilesBtn = $("#selectFilesBtn");
    $clearListBtn = $("#clearListBtn");
    $errorList = $("#errorList");
    clearListDialog = getDialogElement("clearListDialog");
    errorDialog = getDialogElement("errorDialog");
    fileItemHTML = $("#fileItemTemplate").html().trim();

    Sortable.create(/** @type {HTMLElement} */ ($fileList.get(0)), {
        animation: 150,
        direction: "vertical",
        draggable: ".file-item",
        forceFallback: true,
        fallbackTolerance: 3,
        ghostClass: "sortable-placeholder",
        handle: ".drag-handle",
        onUpdate() {
            syncStateFromFileListOrder();
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
            showDialog(clearListDialog);
        });

    clearListDialog.addEventListener("close", () => {
        if (clearListDialog.returnValue === "confirm") {
            intentToClearFiles$.next();
        }
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
        })
        .on("click", ".show-btn", function (e) {
            e.stopPropagation();
            const index = parseInt(String($(this).closest(".file-item").attr("data-index")), 10);
            intentToShowFile$.next(index);
        });
}

/**
 * @param {string} id
 * @returns {HTMLDialogElement}
 */
function getDialogElement(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLDialogElement)) {
        throw new Error(`Expected #${id} to be a dialog element.`);
    }
    return element;
}

/**
 * @param {HTMLDialogElement} dialog
 */
function showDialog(dialog) {
    dialog.returnValue = "";
    if (!dialog.open) {
        dialog.showModal();
    }
}

function syncStateFromFileListOrder() {
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
 * @param {DetectedMediaType} detected
 * @returns {string}
 */
function mediaKindLabel(detected) {
    if (detected === IS_IMAGE) return 'Imagen';
    if (detected === IS_VIDEO) return 'Video';
    return 'Audio';
}

/**
 * @param {DetectedMediaType} detected
 * @returns {'image' | 'video' | 'audio'}
 */
function mediaKindClass(detected) {
    if (detected === IS_IMAGE) return 'image';
    if (detected === IS_VIDEO) return 'video';
    return 'audio';
}

/**
 * @param {File} file
 * @returns {string}
 */
function fileTypeLabel(file) {
    const subtype = file.type.split('/')[1];
    if (subtype) {
        return subtype.toUpperCase();
    }
    const extension = file.name.split('.').pop();
    return extension ? extension.toUpperCase() : 'Tipo desconocido';
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
            fileTypeLabel: fileTypeLabel(item.file),
            fileName: item.file.name,
            mediaKind: mediaKindLabel(item.detected),
            mediaKindClass: mediaKindClass(item.detected),
            isTimelineMedia: item.detected === IS_VIDEO || item.detected === IS_AUDIO,
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
    $emptyState.toggle(newState.length === 0);
    $playlistCount.text(`${newState.length} ${newState.length === 1 ? 'elemento' : 'elementos'}`);
}

/**
 * @param {File} file
 * @returns {Promise<FileDescriptor>}
 */
async function describeImportCandidate(file) {
    try {
        return {
            file,
            detected: await detectImportableMediaType(file),
        };
    } catch {
        return {
            file,
            detected: '',
        };
    }
}

const fileDescriptorBatches$ = intentToAddFiles$.pipe(
    mergeMap(files => Promise.all(Array.from(files, describeImportCandidate)), 1)
);

fileDescriptorBatches$
    .subscribe(descriptors => {
        const validDescriptors = descriptors.filter(descriptor => !!descriptor.detected);
        if (validDescriptors.length > 0) {
            const fileItemsBatch = validDescriptors.map(descriptor => (
                createFileItem(descriptor.file, /** @type {DetectedMediaType} */ (descriptor.detected))
            ));
            const currentItems = filesState$.getValue();
            filesState$.next([...currentItems, ...fileItemsBatch]);
        }

        const invalidDescriptors = descriptors.filter(descriptor => !descriptor.detected);
        if (invalidDescriptors.length > 0) {
            unsupportedFiles$.next(invalidDescriptors);
        }
    });

unsupportedFiles$
    .pipe(
        map(descriptors => descriptors.map(d => d.file.name)),
    )
    .subscribe(fileNames => {
        $errorList.empty().append(fileNames.map(name => $("<li>")
            .attr("data-testid", "unsupported-files-list-item")
            .attr("data-key", name)
            .text(name)));
        showDialog(errorDialog);
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
    intentToShowFile$,
    unsupportedFiles$,
    initialize: initializeDOMThings,
    /** @param {ArrayLike<File>} files */
    addFiles: (files) => intentToAddFiles$.next(files),
    /** @param {number} index */
    removeFile: (index) => intentToRemoveFile$.next(index),
    clearFiles: () => intentToClearFiles$.next(),
};
