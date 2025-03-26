# Jehovah Witnesses Multimedia Center

## Propósito del Proyecto

Este proyecto es una Aplicación Web Progresiva (PWA) diseñada específicamente para la comunidad de Testigos de Jehová, con el propósito de facilitar la presentación de contenido multimedia durante reuniones, asambleas u otros eventos religiosos. La aplicación permite gestionar y mostrar diversos tipos de medios (imágenes, videos y audio) a través de varios monitores o pantallas.

## Características Principales

1. **Gestión de Múltiples Pantallas**: Permite detectar y utilizar varias pantallas o monitores conectados al dispositivo, distinguiendo entre la pantalla primaria y secundarias.

2. **Biblioteca de Medios**: Interfaz para subir, organizar y gestionar archivos multimedia (imágenes, videos, audio).

3. **Controles de Presentación**: Funcionalidades para iniciar/detener presentaciones, navegar entre medios (anterior/siguiente) y controlar la reproducción de medios (play/pausa, avance rápido, retroceso).

4. **Modo Pantalla Completa**: Capacidad para mostrar el contenido en pantalla completa, optimizando la experiencia visual.

5. **Comunicación entre Ventanas**: Implementa un sistema de comunicación entre la ventana de control y la ventana de presentación mediante SharedWorker y RxJS.

6. **Interfaz de Usuario Intuitiva**: Panel de control con vista previa de monitores, lista de medios y controles de presentación.

7. **Funcionalidad Offline**: Como PWA, puede funcionar sin conexión a internet una vez instalada.

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript
- **Librerías**: jQuery, jQuery UI, RxJS, EJS (para plantillas)
- **PWA**: Service Worker para funcionamiento offline
- **Servidor Web**: Configuración para Caddy Server

## Estructura de la Aplicación

- **Panel de Control** (index.html): Interfaz principal para gestionar medios y controlar presentaciones
- **Ventana de Presentación** (presentation.html): Ventana secundaria que muestra el contenido multimedia
- **Vista de Marco** (frame.html): Posiblemente utilizada para mostrar contenido enmarcado

## Público Objetivo

Esta aplicación está diseñada específicamente para ser utilizada por miembros de los Testigos de Jehová durante sus reuniones y eventos, facilitando la presentación de material audiovisual para apoyar su ministerio y actividades educativas religiosas.

## Estado del Proyecto

El proyecto se encuentra en desarrollo activo, con una estructura bien definida y funcionalidades clave ya implementadas, siguiendo las mejores prácticas de desarrollo web moderno. 