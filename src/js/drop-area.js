/**
 * els Elements
 * @typedef {Object} DropAreaElementReferences
 * @property {HTMLDivElement} filesDropArea
 * @property {HTMLInputElement} filesInput
 */
const els = {
    filesDropArea: null,
    filesInput: null,
};

function createImageNodeFromFile(file) {
    const imageNode = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    imageNode.onload = () => {
        URL.revokeObjectURL(objectUrl);
    };

    imageNode.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        imageNode.src = '';
    };

    imageNode.src = objectUrl;

    return imageNode;
}

function handleNewFilesSelected() {
    const {filesInput: {files: fls}} = els;
    const files = Array.from(fls);

    files.forEach(file => {
        const imageType = /^image\//;

        if (!imageType.test(file.type)) {
            alert('Please select an image file.');
            return;
        }

        const imageNode = createImageNodeFromFile(file);
        document.body.appendChild(imageNode);
    });
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

    }
}

function setElementReferences() {
    els.filesDropArea = document.getElementById('filesDropArea');
    els.filesInput = document.getElementById('filesInput');
}

function setElementListeners() {
    const {filesDropArea, filesInput} = els;

    filesDropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        filesDropArea.classList.add('drop-area--drag-over');
    });

    filesDropArea.addEventListener('dragleave', () => {
        filesDropArea.classList.remove('drop-area--drag-over');
    });

    filesDropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        filesDropArea.classList.remove('drop-area--drag-over');
        filesInput.files = event.dataTransfer.files;
        handleNewFilesSelected(filesInput.files);
    });

    filesInput.addEventListener('change', () => {
        handleNewFilesSelected(filesInput.files);
    });
}

export default function initDropArea() {
    setElementReferences();
    setElementListeners();
}