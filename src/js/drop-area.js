import {handleNewFilesSelected} from "./file-handling.js";
import {getReferencesForDropArea} from "./element-references.js";

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
    filesDropArea.classList.add('drop-area--drag-over');
}

function onDragLeaveHandler() {
    filesDropArea.classList.remove('drop-area--drag-over');
}

function onChangeHandler() {
    handleNewFilesSelected(filesInput.files);
}

function onDropHandler(event) {
    event.preventDefault();
    filesDropArea.classList.remove('drop-area--drag-over');
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