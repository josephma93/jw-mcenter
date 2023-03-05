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
		const imageWindow = window.open("", "imageWindow");
		imageWindow.document.write("<img src='" + event.data.image + "'>");
	}

	function enableWorker() {
		try {
			sharedWorker = new SharedWorker("worker.js");
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
		messagePort.addEventListener("messageerror", function onMessageError(event) {
			// Fired when a MessagePort object receives a message that can't be deserialized.
			alert("Falla inesperada del sistema. Intente ejecutar nuevamente la accion, de no funcionar recargue la pagina he intente de nuevo.");
			console.error("Shared worker error detected. Event captured: ", JSON.stringify(event));
		});
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