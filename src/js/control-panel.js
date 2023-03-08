(function iife() {
	const elFileInput = document.getElementById("fileInput");
	const elPrevBtn = document.getElementById("prevBtn")
	const elNextBtn = document.getElementById("nextBtn")
	const elPresentBtn = document.getElementById("presentBtn")

	let images = [];
	let index = 0;
	/** @type {SharedWorker} */
	let sharedWorker;
	/** @type {MessagePort} */
	let messagePort;

	function onFileInputChange(event) {
		images = Array.from(event.target.files);
		index = 0;
		if (images.length > 0) {
			document.getElementById("prevBtn").disabled = false;
			document.getElementById("nextBtn").disabled = false;
			document.getElementById("presentBtn").disabled = false;
		}
	}

	function prevImage() {
		if (index > 0) {
			index--;
			sharedWorker.port.postMessage({ action: "prev", index: index, image: images[index] });
		}
	}

	function nextImage() {
		if (index < images.length - 1) {
			index++;
			sharedWorker.port.postMessage({ action: "next", index: index, image: images[index] });
		}
	}

	function presentImages() {
		sharedWorker.port.postMessage({ action: "start", image: images[index] });
	}

	function onMessageRecievedFromWorker(event) {
		console.debug("Message received from worker, event: ", event);
	}

	function enableWorker() {
		try {
			sharedWorker = new SharedWorker("js/worker.js");
		} catch (error) {
			alert("Falla inesperada del sistema. Recargue la pagina he intente de nuevo.");
		}
		sharedWorker.addEventListener("error", function onSharedWorkedError(event) {
			// Fires when an error occurs in the shared worker.
			alert("Falla inesperada del sistema. Intente ejecutar nuevamente la accion, de no funcionar recargue la pagina he intente de nuevo.");
			console.error("Shared worker error detected. Event captured: ", JSON.stringify(event));
		});
		messagePort = sharedWorker.port;
		messagePort.onmessage = onMessageRecievedFromWorker;
		messagePort.onmessageerror = function onMessageError(event) {
			// Fired when a MessagePort object receives a message that can't be deserialized.
			alert("Falla inesperada del sistema. Intente ejecutar nuevamente la accion, de no funcionar recargue la pagina he intente de nuevo.");
			console.error("Shared worker error detected. Event captured: ", JSON.stringify(event));
		};
	}

	if (window.SharedWorker) {
		enableWorker();
	} else {
		alert("Su navegador no dispone de las caracteristicas necesarias para usar este sistema.");
	}

	elFileInput.addEventListener("change", onFileInputChange);
	elPrevBtn.addEventListener("click", prevImage);
	elNextBtn.addEventListener("click", nextImage);
	elPresentBtn.addEventListener("click", presentImages);

})();


// Get the drop area and file input elements
const elDropArea = document.querySelector('#file-drop-area');
const elFileInput = document.querySelector('#file-input');

// Add drag and drop event listeners to the drop area
elDropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    elDropArea.classList.add('drag-over');
});

elDropArea.addEventListener('dragleave', () => {
    elDropArea.classList.remove('drag-over');
});

elDropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    elDropArea.classList.remove('drag-over');
    elFileInput.files = event.dataTransfer.files;
    validateAndDisplayImages(elFileInput.files);
});

// Add change event listener to the file input
elFileInput.addEventListener('change', () => {
    validateAndDisplayImages(elFileInput.files);
});

// Define a function to validate and display images
function validateAndDisplayImages(files) {
    // Loop through each file and validate that it's an image file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageType = /^image\//;

        if (!imageType.test(file.type)) {
            alert('Please select an image file.');
            return;
        }

        // Create an image node for the file and append it to the document body
        const imageNode = createImageNodeFromFile(file);
        document.body.appendChild(imageNode);
    }
}

// Define a function to create an image node from a file
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
