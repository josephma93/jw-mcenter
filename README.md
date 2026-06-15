# Jehovah Witnesses Multimedia Center

## Propósito del Proyecto

Este proyecto es una aplicación web local diseñada específicamente para la comunidad de Testigos de Jehová, con el propósito de facilitar la presentación de contenido multimedia durante reuniones, asambleas u otros eventos religiosos. La aplicación permite gestionar y mostrar diversos tipos de medios (imágenes, videos y audio) a través de varios monitores o pantallas.

## Características Principales

1. **Gestión de Múltiples Pantallas**: Permite detectar y utilizar varias pantallas o monitores conectados al dispositivo, distinguiendo entre la pantalla primaria y secundarias.

2. **Biblioteca de Medios**: Interfaz para subir, organizar y gestionar archivos multimedia (imágenes, videos, audio).

3. **Controles de Presentación**: Funcionalidades para iniciar/detener presentaciones, navegar entre medios (anterior/siguiente) y controlar la reproducción de medios (play/pausa, avance rápido, retroceso).

4. **Modo Pantalla Completa**: Capacidad para mostrar el contenido en pantalla completa, optimizando la experiencia visual.

5. **Comunicación entre Ventanas**: Implementa un sistema de comunicación entre la ventana de control y la ventana de presentación mediante SharedWorker y RxJS.

6. **Interfaz de Usuario Intuitiva**: Panel de control con vista previa de monitores, lista de medios y controles de presentación.

7. **Ejecución Local**: Las dependencias del navegador están vendorizadas en el repositorio. La instalación PWA y el modo offline activo quedan para una fase posterior; el service worker existe pero no está registrado.

## Tecnologías Utilizadas

- **Frontend**: HTML, CSS y JavaScript crudos — **sin paso de build**: el navegador ejecuta los archivos tal como están escritos
- **Librerías**: jQuery, SortableJS (reordenamiento), RxJS, EJS (para plantillas), vendorizadas localmente en `src/vendor/` (sin CDNs, funciona offline)
- **Servidor Web**: cualquier servidor estático; en desarrollo se usa [portless](https://portless.sh/) para HTTPS con URL estable (`https://jw-mcenter.localhost` en `main`, `https://<worktree>.jw-mcenter.localhost` en worktrees)

## Estructura del Repositorio

- **`src/`**: la aplicación (raíz web)
  - **Panel de Control** (`src/index.html`): interfaz principal para gestionar medios y controlar presentaciones
  - **Ventana de Presentación** (`src/presentation.html`): ventana secundaria que muestra el contenido multimedia
- **`sandbox/`**: experimentos y POCs no conectados a la aplicación
- **`test/`**: pruebas de humo (Playwright)

## Cómo Ejecutar

Ver [CONTRIBUTING.md](CONTRIBUTING.md). En corto: `nvm use && npm install && npm start`, y abrir la URL de Portless en un navegador Chromium. En worktrees, la URL incluye el prefijo de la rama para poder ejecutar varias copias en paralelo.

## Público Objetivo

Esta aplicación está diseñada específicamente para ser utilizada por miembros de los Testigos de Jehová durante sus reuniones y eventos, facilitando la presentación de material audiovisual para apoyar su ministerio y actividades educativas religiosas.

## Estado del Proyecto

POC CU-01 + CU-02 implementado en el flujo automatizado local: agregar archivos de imagen/video/audio, seleccionar monitor secundario, abrir presentador, navegar entre medios, play/pausa, ±10s, terminar presentación y supervisar el cierre maestro/presentador. La aceptación final en hardware real debe registrarse con la lista de verificación de [TESTING.md](TESTING.md).
