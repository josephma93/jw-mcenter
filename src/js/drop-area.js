import {handleNewFilesSelected} from "./file-handling.js";
import {getReferencesForDropArea} from "./element-references.js";
import {bind} from 'ramda';
import {Subject} from 'rxjs';

/**
 * @type {Subject<FileHandlingResult>}
 */
const fileSelectionSubject = new Subject();

/**
 * @type {Observable<FileHandlingResult>}
 */
export const $fileSelection = fileSelectionSubject.asObservable();

/**
 * @typedef {DropAreaElementReferences.filesDropArea}
 */
let filesDropArea;

/**
 * @typedef {DropAreaElementReferences.filesInput}
 */
let filesInput;

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
    handleNewFilesSelected(filesInput.files)
        .then(bind(fileSelectionSubject.next, fileSelectionSubject));

}

function onDropHandler(event) {
    event.preventDefault();
    filesDropArea.classList.remove('drop-area--drag-over', 'bg-light');
    filesInput.files = event.dataTransfer.files;
    onChangeHandler();
}

function setElementListeners() {
    filesDropArea.addEventListener('dragover', onDragOverHandler);
    filesDropArea.addEventListener('dragleave', onDragLeaveHandler);
    filesDropArea.addEventListener('drop', onDropHandler);
    filesInput.addEventListener('change', onChangeHandler);
}

export default function initDropArea() {
    ({ filesDropArea, filesInput } = getReferencesForDropArea());
    setElementListeners();
}