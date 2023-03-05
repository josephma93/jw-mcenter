// Declaración de variables
let index = 0;
let images = [];

// Función para manejar los mensajes del puerto compartido
function handleSharedWorkerMessage(event) {
	switch(event.data.action) {
		case "start":
			index = event.data.index;
			images = event.data.image;
			break;
		case "prev":
			index = event.data.index;
			images = event.data.image;
			break;
		case "next":
			index = event.data.index;
			images = event.data.image;
			break;
	}
	self.postMessage({image: images[index]});
}

// Crear puerto compartido
const sharedWorkerPort = self;

// Asociar función a eventos
sharedWorkerPort.addEventListener("message", handleSharedWorkerMessage);
