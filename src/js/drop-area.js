import {$selectionResultObjs, handleNewFilesSelected} from "./file-handling.js";
import {getReferencesForDropArea} from "./element-references.js";
import {fromEvent, filter, Subject} from 'rxjs';

// Emit a signal when the files dropped have been processed.
const dropFilesProcessedSignal = new Subject();

export const $dropFilesProcessedSignal = dropFilesProcessedSignal.asObservable();

/**
 * All files that aren't supported
 * @type {Observable<SelectionResultObj>}
 */
export const $invalidsSelected = $selectionResultObjs.pipe(
    filter(selection => selection.typeCode === 0)
);

/**
 * Images selected and converted into HTMLImageElements
 * @type {Observable<SelectionResultObj>}
 */
export const $imagesSelected = $selectionResultObjs.pipe(
    filter(selection => selection.typeCode === 1)
);

/**
 * Videos selected and converted into HTMLVideoElements
 * @type {Observable<SelectionResultObj>}
 */
export const $videosSelected = $selectionResultObjs.pipe(
    filter(selection => selection.typeCode === 2)
);

/**
 * @typedef {DropAreaElementReferences.filesDropArea}
 */
let filesDropArea;

/**
 * @typedef {DropAreaElementReferences.filesInput}
 */
let filesInput;

/**
 * @param {DragEvent} event
 */
function onDragOverHandler(event) {
    event.preventDefault();
    filesDropArea.classList.add('drop-area--drag-over', 'bg-light');
}

function onDragLeaveHandler() {
    filesDropArea.classList.remove('drop-area--drag-over', 'bg-light');
}

/**
 * Handles when files are selected by the user.
 */
function onChangeHandler() {
    handleNewFilesSelected(filesInput.files);
    dropFilesProcessedSignal.next();
}

/**
 * @param {DragEvent} event
 */
function onDropHandler(event) {
    event.preventDefault();
    filesDropArea.classList.remove('drop-area--drag-over', 'bg-light');
    filesInput.files = event.dataTransfer.files;
    onChangeHandler();
}

function setElementListeners() {
    // TODO: stop the flickering effect.
    fromEvent(filesDropArea, 'dragover').subscribe(onDragOverHandler);
    fromEvent(filesDropArea, 'dragleave').subscribe(onDragLeaveHandler);
    fromEvent(filesDropArea, 'drop').subscribe(onDropHandler);
    fromEvent(filesInput, 'change').subscribe(onChangeHandler);
}

export function initDropArea() {
    ({ filesDropArea, filesInput } = getReferencesForDropArea());
    setElementListeners();
}