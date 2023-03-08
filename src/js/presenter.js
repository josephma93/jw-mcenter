(function iife() {

    function createImageNodeFromFile(file) {
        // Create a new image node
        const imageNode = document.createElement('img');
      
        // Create a new object URL for the file
        const objectUrl = URL.createObjectURL(file);
      
        // When the object URL has been created, set the image source and revoke the object URL
        imageNode.onload = () => {
          URL.revokeObjectURL(objectUrl);
        };
      
        // If an error occurs, revoke the object URL and set the image source to an empty string
        imageNode.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          imageNode.src = '';
        };
      
        // Set the image source to the object URL
        imageNode.src = objectUrl;
      
        // Return the image node
        return imageNode;
      }
      
      



    function onMessageRecievedFromWorker(event) {
        console.debug("Message received from worker, event: ", event);
        document.getElementById('consoleLog').textContent += '\n' + JSON.stringify(event);
        if (event.data.action === 'start') {
            let img = createImageNodeFromFile(event.data.image);
            document.body.appendChild(img);
        }
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
})();