# Especificación de Requisitos de Software
## Jehovah Witnesses Multimedia Center

### 1. Introducción

#### 1.1 Propósito
Este documento de Especificación de Requisitos de Software (SRS) describe los requisitos para el desarrollo de "Jehovah Witnesses Multimedia Center", una aplicación web progresiva (PWA) diseñada para facilitar la presentación de contenido multimedia durante reuniones, asambleas y eventos religiosos de los Testigos de Jehová. La aplicación funciona como un reproductor multimedia local, similar a VLC, pero con capacidad para gestionar múltiples pantallas.

#### 1.2 Alcance
El sistema permitirá a los usuarios seleccionar y reproducir contenido multimedia local (imágenes, videos y audio) a través de múltiples pantallas o monitores. La aplicación será capaz de funcionar sin conexión a internet una vez instalada, ofreciendo una experiencia fluida y profesional para la presentación de material audiovisual.

**Arquitectura Dual de Ventanas**: El sistema funcionará con dos ventanas interconectadas: (1) un panel de control principal que sirve como ventana maestra y (2) una ventana de presentación secundaria que se abre bajo demanda en un monitor secundario, completamente dependiente del panel de control.

**Reproductor Multimedia Local**: La aplicación no sube archivos a ningún servidor, sino que trabaja exclusivamente con archivos locales, haciendo referencia a ellos para su reproducción, similar a cómo funcionan reproductores como VLC.

**Bibliotecas Multimedia Predeterminadas**: El sistema tendrá acceso a múltiples bibliotecas predeterminadas de contenido multimedia, incluyendo imágenes, videos y audios utilizados por los Testigos de Jehová. Estas bibliotecas se encuentran en diferentes ubicaciones del dispositivo, permitiendo al usuario configurar cada una de estas rutas de forma independiente para cualquier tipo de contenido multimedia.

#### 1.3 Definiciones, Acrónimos y Abreviaturas
- **PWA**: Aplicación Web Progresiva
- **UI**: Interfaz de Usuario
- **UX**: Experiencia de Usuario
- **RxJS**: Reactive Extensions for JavaScript
- **SharedWorker**: API de JavaScript que permite la comunicación entre diferentes contextos de navegación
- **Ventana Maestra**: Panel de control principal desde donde se administra el contenido y se controlan las presentaciones
- **Ventana Esclava**: Ventana de presentación que depende completamente de la ventana maestra y que muestra el contenido multimedia
- **API getScreenDetails()**: API de JavaScript que permite obtener información detallada sobre todas las pantallas conectadas al dispositivo
- **Screen Change Events**: Eventos del navegador que notifican cambios en la configuración de pantallas conectadas
- **ESM**: ECMAScript Modules, sistema de módulos estándar de JavaScript
- **ES2024**: Especificación de ECMAScript para el año 2024, que incluye las características más recientes del lenguaje JavaScript
- **Vite**: Herramienta de desarrollo y build usada para servir y empaquetar la aplicación multipágina
- **Workbox**: Librerías usadas por el service worker generado para precache y control de actualizaciones
- **Container Queries**: Característica CSS moderna que permite aplicar estilos basados en el tamaño del contenedor, no solo de la ventana
- **CSS Custom Properties**: Variables definidas en CSS que permiten reutilizar valores y crear temas dinámicos
- **CSS Grid Layout**: Sistema de diseño bidimensional para CSS que permite crear layouts complejos y responsivos

### 2. Descripción General

#### 2.1 Perspectiva del Producto
La aplicación se ejecutará como una PWA independiente que puede instalarse en diversos dispositivos. Está diseñada para ser utilizada durante reuniones religiosas donde se necesita mostrar contenido multimedia. La aplicación será capaz de detectar múltiples monitores y dirigir el contenido al monitor seleccionado por el usuario.

**Modelo de Operación Maestro-Esclavo**: El sistema opera con un modelo de dos ventanas: una ventana maestra (panel de control) que administra todo el sistema y una ventana esclava (ventana de presentación) que se abre bajo demanda y se muestra en un monitor secundario. La ventana de presentación no puede funcionar de manera independiente y depende completamente del panel de control para todas sus operaciones.

#### 2.2 Funciones del Producto
- Gestión de archivos multimedia locales (seleccionar, organizar, previsualizar)
- Configuración de listas de reproducción (playlists) con orden personalizable
- Acceso persistente a múltiples bibliotecas multimedia predeterminadas de los Testigos de Jehová (imágenes, videos y audios)
- Detección y administración de múltiples pantallas
- Presentación de contenido multimedia en pantalla completa
- Controles de navegación y reproducción de medios
- Funcionamiento offline
- Comunicación sincronizada entre panel de control y ventana de presentación
- Apertura de la ventana de presentación bajo demanda en un monitor secundario seleccionado

#### 2.3 Características de los Usuarios
- **Usuarios Primarios**: Miembros de los Testigos de Jehová encargados de la presentación de contenido multimedia durante reuniones y eventos religiosos.
- **Nivel de Experiencia**: Se espera un nivel básico a intermedio de conocimientos tecnológicos.

#### 2.4 Restricciones
- La aplicación debe funcionar exclusivamente en navegadores basados en Chromium (Chrome, Edge, Opera, etc.)
- Debe implementarse utilizando características modernas de JavaScript (ES2024), incluyendo pero no limitado a: ESM, generadores, async/await, top-level await, nullish coalescing, optional chaining
- Debe compilarse como una app multipágina con Vite, manteniendo dos entrypoints independientes: `/` y `/presentation.html`
- Las dependencias de terceros se gestionan con npm y se integran al build de Vite; no se permiten CDNs
- El entorno de desarrollo debe servir la aplicación sobre HTTPS con una URL estable mediante portless (`https://jw-mcenter.localhost`), garantizando el contexto seguro que requieren las APIs del navegador
- Debe implementar características CSS de última generación como container queries, variables, custom properties y grid layouts
- El panel de control debe ser responsivo y funcionar adecuadamente en resoluciones desde 1024×768 en adelante
- La ventana de presentación debe mantener la relación de aspecto original de los contenidos multimedia
- Debe operar correctamente en diferentes tamaños de pantalla y resoluciones
- Debe funcionar sin conexión a internet una vez instalada
- Debe tener un rendimiento fluido al manejar archivos multimedia de gran tamaño
- No debe considerar compatibilidad con navegadores no basados en Chromium (Firefox, Safari, etc.)

#### 2.5 Suposiciones y Dependencias
- Se asume que los usuarios tienen acceso a al menos un dispositivo con capacidad para ejecutar un navegador web moderno
- Se depende de las APIs del navegador para la detección de múltiples pantallas y funcionamiento como PWA

### 3. Requisitos Específicos

#### 3.1 Requisitos de Interfaz

##### 3.1.1 Interfaz de Usuario
- **REQ-UI-01**: La aplicación debe ofrecer un panel de control principal con tres secciones principales: vista previa de monitores, controles de presentación y lista de medios.
- **REQ-UI-02**: Debe proporcionar una ventana de presentación separada que muestre el contenido multimedia en el monitor seleccionado.
- **REQ-UI-03**: La interfaz debe ser intuitiva y fácil de usar, con controles claramente identificables.
- **REQ-UI-04**: Debe ofrecer vista previa de los archivos multimedia antes de presentarlos.
- **REQ-UI-05**: Debe implementar características CSS de última generación:
  - Container queries para elementos adaptativos basados en el tamaño de su contenedor
  - Variables CSS y custom properties para mantener consistencia visual y facilitar temas
  - Grid layouts para estructurar la interfaz de manera eficiente y responsiva
- **REQ-UI-06**: El panel de control debe funcionar correctamente en resoluciones desde 1024×768 en adelante.
- **REQ-UI-07**: La ventana de presentación debe ocupar el monitor completo manteniendo siempre la relación de aspecto original de los archivos multimedia, aunque esto resulte en espacios en blanco o contenido pixelado.

##### 3.1.2 Interfaz de Hardware
- **REQ-HW-01**: La aplicación debe detectar automáticamente todos los monitores conectados al dispositivo.
- **REQ-HW-02**: Debe funcionar con diversos tipos de dispositivos de entrada (ratón, teclado, pantalla táctil).

##### 3.1.3 Interfaz de Software
- **REQ-SW-01**: Debe funcionar exclusivamente en navegadores web basados en Chromium (Chrome, Edge, Opera, etc.).
- **REQ-SW-02**: Debe integrarse con las APIs del navegador para la detección de pantallas y persistencia offline.
- **REQ-SW-03**: Debe implementarse utilizando ECMAScript Modules (ESM) para la organización del código.
- **REQ-SW-04**: Debe aprovechar las características modernas de JavaScript (ES2024), incluyendo:
  - Módulos ESM con importación y exportación dinámica
  - Generadores y funciones asincrónicas (async/await)
  - Top-level await
  - Nullish coalescing (??) y optional chaining (?.)
  - Operadores lógicos de asignación (&&=, ||=, ??=)
  - Métodos privados y campos de clase
  - Otras características modernas disponibles en ES2024
- **REQ-SW-05**: No debe incluir polyfills o código para compatibilidad con navegadores antiguos o no basados en Chromium.
- **REQ-SW-06**: El código de la aplicación debe ser JavaScript puro ejecutado directamente por el navegador, sin compilación ni transpilación. Todos los archivos JavaScript deben incluir `// @ts-check` y anotaciones JSDoc (requisito obligatorio), verificados con `tsc --noEmit` — un chequeo, nunca una compilación.
- **REQ-SW-07**: Debe existir un paso de build con Vite que produzca una salida determinista en `dist/`, manteniendo los entrypoints `/` y `/presentation.html` como páginas distintas.
- **REQ-SW-08**: La aplicación debe poder servirse como archivos estáticos desde `dist/`; en desarrollo se sirve mediante Vite detrás de portless para garantizar un contexto seguro (`getScreenDetails()`, SharedWorker).

#### 3.2 Requisitos Funcionales

##### 3.2.1 Gestión de Archivos Multimedia
- **REQ-FM-01**: El sistema debe permitir seleccionar archivos locales de imagen (jpg, png, gif, etc.), video (mp4, webm) y audio (mp3, wav).
- **REQ-FM-02**: Debe permitir organizar los archivos en una lista de reproducción ordenable mediante arrastrar y soltar.
- **REQ-FM-03**: Debe permitir eliminar y duplicar referencias a archivos de la lista.
- **REQ-FM-04**: Debe ofrecer previsualización de todos los tipos de archivos.
- **REQ-FM-05**: El sistema debe trabajar con referencias a los archivos locales, sin subirlos a ningún servidor externo.
- **REQ-FM-06**: Debe funcionar como un reproductor multimedia local, similar a VLC, pero con capacidades de gestión de múltiples pantallas.
- **REQ-FM-07**: El sistema debe proporcionar acceso directo a bibliotecas predeterminadas de contenido multimedia (imágenes, audios y videos) utilizadas por los Testigos de Jehová.
- **REQ-FM-08**: Debe permitir al usuario configurar múltiples ubicaciones para diferentes tipos de contenido o para bibliotecas temáticas.
- **REQ-FM-09**: Debe permitir añadir elementos de cualquier biblioteca configurada a la lista de reproducción actual o reproducirlos inmediatamente.

##### 3.2.2 Gestión de Pantallas
- **REQ-SM-01**: El sistema debe detectar automáticamente todos los monitores conectados utilizando la API `window.getScreenDetails()`.
- **REQ-SM-02**: Debe permitir seleccionar qué monitor se usará para la presentación.
- **REQ-SM-03**: Debe mostrar información detallada de cada monitor (resolución, si es primario, etc.).
- **REQ-SM-04**: Debe proporcionar una representación visual de la disposición de los monitores en forma de canvas o diagrama interactivo.
- **REQ-SM-05**: El sistema debe monitorear constantemente los cambios en la configuración de pantallas mediante eventos de cambio de pantalla.
- **REQ-SM-06**: Debe actualizar la representación visual y la información de las pantallas en tiempo real cuando se detecten cambios (conexión, desconexión o cambios de configuración).
- **REQ-SM-07**: Si una pantalla seleccionada para presentación se desconecta, el sistema debe notificar al usuario y sugerir alternativas.
- **REQ-SM-08**: Debe permitir ver la disposición física de las pantallas tal como están organizadas en el sistema operativo del usuario.

##### 3.2.3 Presentación de Contenido
- **REQ-PC-01**: El sistema debe abrir una ventana de presentación bajo demanda en el monitor secundario seleccionado.
- **REQ-PC-02**: Debe mostrar el contenido multimedia a pantalla completa.
- **REQ-PC-03**: Debe navegar secuencialmente por los archivos multimedia en la lista.
- **REQ-PC-04**: Debe proporcionar controles para iniciar/detener la presentación, avanzar/retroceder y controlar la reproducción de video/audio.
- **REQ-PC-05**: La ventana de presentación debe ser completamente dependiente del panel de control (relación maestro-esclavo) y no debe poder operar de forma independiente.

##### 3.2.4 Comunicación entre Ventanas
- **REQ-CW-01**: El sistema debe mantener sincronizadas la ventana de control (maestra) y la ventana de presentación (esclava) a través de SharedWorker.
- **REQ-CW-02**: Debe detectar cuando la ventana de presentación se cierra y actualizar el estado en la ventana de control.
- **REQ-CW-03**: Debe transmitir información de tiempo de reproducción para archivos de video y audio.
- **REQ-CW-04**: La comunicación debe ser bidireccional pero con una jerarquía clara donde la ventana maestra controla todas las acciones de la ventana esclava.
- **REQ-CW-05**: Si la ventana maestra (panel de control) se cierra, la ventana esclava (presentación) debe cerrarse automáticamente, reflejando su dependencia.

##### 3.2.5 Funcionamiento Offline
- **REQ-OF-01**: El sistema debe funcionar completamente sin conexión a internet una vez instalado.
- **REQ-OF-02**: Debe acceder directamente a los archivos multimedia locales referenciados.
- **REQ-OF-03**: Debe permitir la instalación como aplicación en el dispositivo (PWA).
- **REQ-OF-04**: No debe requerir ningún servidor para su funcionamiento, operando completamente en el cliente.
- **REQ-OF-05**: Debe implementar un Service Worker controlado por la aplicación mediante `vite-plugin-pwa` en modo `injectManifest`, con Workbox para precache y sin fallback SPA ciego.
- **REQ-OF-06**: Debe utilizar estrategias de caché para:
  - Almacenar en caché todos los recursos estáticos (HTML, CSS, JavaScript, imágenes de la interfaz)
  - Implementar la estrategia Cache-First para recursos estáticos
  - Implementar precaching de los recursos críticos durante la instalación
  - Gestionar adecuadamente la actualización de la caché cuando se publiquen nuevas versiones
- **REQ-OF-07**: Debe persistir la configuración local necesaria del usuario mediante IndexedDB u otro almacenamiento cliente apropiado. No debe prometer persistencia offline automática de medios seleccionados por el usuario salvo cuando se implemente explícitamente.
- **REQ-OF-08**: Debe proporcionar retroalimentación visual clara sobre el estado offline/listo-para-offline y sobre la disponibilidad de actualizaciones.

##### 3.2.6 Gestión de Bibliotecas Predeterminadas
- **REQ-BD-01**: El sistema debe permitir configurar múltiples ubicaciones de bibliotecas predeterminadas para cualquier tipo de contenido multimedia (imágenes, audios, videos).
- **REQ-BD-02**: Debe solicitar permisos de acceso a las ubicaciones de las bibliotecas predeterminadas una única vez por cada ubicación.
- **REQ-BD-03**: Debe recordar todas las ubicaciones configuradas entre sesiones, evitando que el usuario tenga que volver a configurarlas.
- **REQ-BD-04**: Debe proporcionar acceso inmediato a todos los archivos multimedia almacenados en las bibliotecas predeterminadas al iniciar la aplicación.
- **REQ-BD-05**: Debe categorizar y organizar los archivos de las bibliotecas predeterminadas de manera intuitiva por tipo, ubicación, nombre, etc.
- **REQ-BD-06**: Debe permitir búsqueda rápida dentro de las bibliotecas predeterminadas, con opción de filtrar por tipo de contenido.
- **REQ-BD-07**: Debe manejar adecuadamente cambios en las ubicaciones o contenido de las bibliotecas predeterminadas, con mecanismos para reparar/actualizar referencias.
- **REQ-BD-08**: Debe permitir añadir, modificar o eliminar ubicaciones de bibliotecas configuradas en cualquier momento.
- **REQ-BD-09**: Debe tratar de manera estandarizada todos los tipos de contenido multimedia (imágenes, videos y audios), simplificando así la lógica del sistema.

#### 3.3 Requisitos No Funcionales

##### 3.3.1 Rendimiento
- **REQ-PF-01**: El sistema debe cargar en menos de 3 segundos en condiciones normales.
- **REQ-PF-02**: Debe manejar archivos de video de hasta 1080p sin ralentizaciones.
- **REQ-PF-03**: La navegación entre archivos multimedia debe ser menor a 1 segundo.

##### 3.3.2 Seguridad
- **REQ-SC-01**: El sistema debe funcionar completamente en el cliente, sin enviar datos a servidores externos.
- **REQ-SC-02**: Debe solicitar permiso explícito para acceder a funcionalidades como pantalla completa.

##### 3.3.3 Usabilidad
- **REQ-US-01**: La interfaz debe ser comprensible para usuarios con conocimientos tecnológicos básicos.
- **REQ-US-02**: Debe ofrecer retroalimentación visual clara para todas las acciones.
- **REQ-US-03**: Debe ser utilizable en una variedad de tamaños de pantalla.

##### 3.3.4 Confiabilidad
- **REQ-RL-01**: El sistema debe retener el estado actual en caso de cierre accidental.
- **REQ-RL-02**: Debe gestionar adecuadamente archivos corruptos o no soportados.
- **REQ-RL-03**: Debe mantener sincronización entre ventanas incluso ante retrasos o interrupciones momentáneas.

##### 3.3.5 Adaptabilidad
- **REQ-AD-01**: El sistema debe adaptarse dinámicamente a cambios en la configuración de pantallas mientras está en ejecución.
- **REQ-AD-02**: Debe manejar adecuadamente la reconexión de pantallas previamente configuradas.
- **REQ-AD-03**: Debe actualizar la interfaz de usuario en tiempo real para reflejar cambios en el hardware de visualización.
- **REQ-AD-04**: Debe seguir funcionando correctamente cuando se cambia la pantalla principal del sistema.

##### 3.3.6 Entorno de Desarrollo
- **REQ-ED-01**: El entorno de desarrollo debe usar Vite para servir la app y debe poder generar `dist/` con un solo comando reproducible.
- **REQ-ED-02**: La versión de Node (usada solo para gestión de dependencias y pruebas) debe estar fijada en `.nvmrc`.
- **REQ-ED-03**: Las dependencias de terceros deben declararse en npm y resolverse en el build de Vite; la aplicación no debe depender de CDNs.
- **REQ-ED-04**: El entorno de desarrollo debe proporcionar HTTPS local mediante portless, con URL estable `https://jw-mcenter.localhost`.
- **REQ-ED-05**: Todos los archivos JavaScript deben comenzar con `// @ts-check` y llevar anotaciones JSDoc. `npm run check` (`tsc --noEmit`) debe pasar sin errores y se ejecuta automáticamente antes de las pruebas (`pretest`).
- **REQ-ED-06**: Debe existir una prueba de humo automatizada (Playwright) que verifique que ambas ventanas arrancan sin errores de consola.

##### 3.3.7 Diseño Responsive y CSS
- **REQ-DR-01**: El sistema debe utilizar container queries para crear componentes de interfaz que respondan al tamaño de su contenedor en lugar de solo a la ventana.
- **REQ-DR-02**: Debe implementar custom properties de CSS para gestionar colores, espaciados y otros valores de estilo de forma consistente.
- **REQ-DR-03**: Debe utilizar CSS Grid Layout como sistema principal para estructurar la interfaz de usuario.
- **REQ-DR-04**: El panel de control debe ser usable y mantener toda su funcionalidad en resoluciones desde 1024×768 hasta 4K.
- **REQ-DR-05**: La ventana de presentación debe preservar la relación de aspecto original del contenido multimedia, centrado en la pantalla.
- **REQ-DR-06**: En la ventana de presentación, los controles de reproducción deben ser accesibles pero discretos, sin interferir con el contenido.
- **REQ-DR-07**: Debe implementar estrategias para gestionar diferentes densidades de píxeles (pantallas de alta resolución vs. estándar).
- **REQ-DR-08**: Debe adoptar un enfoque "mobile-first" para el panel de control, asegurando que sea usable incluso en configuraciones de pantalla pequeña.

##### 3.3.8 Funcionamiento PWA y Offline
- **REQ-PW-01**: La aplicación debe cumplir con todos los requisitos para ser considerada una PWA de alta calidad.
- **REQ-PW-02**: Debe implementar un Service Worker basado en `injectManifest`, donde la app conserva control explícito del flujo de actualización.
- **REQ-PW-03**: Debe funcionar sin conexión para la shell de la aplicación después de la instalación del service worker, incluyendo `/` y `/presentation.html`, utilizando estrategias de caché apropiadas.
- **REQ-PW-04**: Debe proporcionar un archivo de manifiesto que permita la instalación como aplicación nativa.
- **REQ-PW-05**: Debe manejar correctamente eventos de conectividad, adaptando la interfaz para notificar al usuario sobre el estado de la conexión.
- **REQ-PW-06**: Debe detectar nuevas versiones mientras hay conexión, mostrar aviso en el panel de control y aplicar la actualización solo cuando el operador la acepte.
- **REQ-PW-07**: Los datos de usuario (como configuraciones y listas de reproducción) deben persistir entre sesiones utilizando almacenamiento local.

### 4. Apéndices

#### 4.1 Casos de Uso

##### CU-01: Preparación de Presentación Multimedia
**Actor principal**: Encargado de tecnología en reunión religiosa
**Precondiciones**: La aplicación está instalada y funcionando
**Flujo básico**:
1. El usuario abre la aplicación (panel de control - ventana maestra)
2. Selecciona archivos multimedia locales para añadirlos a la lista de reproducción
3. Organiza los archivos en el orden deseado para crear una playlist personalizada
4. Selecciona el monitor secundario para la presentación
5. Inicia la presentación, lo que abre una nueva ventana (ventana esclava) en el monitor seleccionado
6. La presentación se muestra en el monitor secundario seleccionado, mientras que el panel de control permanece en el monitor principal

##### CU-02: Control de Presentación Durante Reunión
**Actor principal**: Encargado de tecnología en reunión religiosa
**Precondiciones**: La presentación está en curso
**Flujo básico**:
1. El usuario avanza al siguiente medio usando los controles
2. Pausa un video cuando es necesario
3. Retrocede a un medio anterior cuando se requiere
4. Termina la presentación al finalizar la reunión

##### CU-03: Uso de las Bibliotecas Predeterminadas de Contenido Multimedia
**Actor principal**: Encargado de tecnología en reunión religiosa
**Precondiciones**: La aplicación está instalada
**Flujo básico**:
1. El usuario abre la aplicación (panel de control - ventana maestra)
2. Si es la primera vez que se usa la aplicación:
   a. El sistema solicita al usuario configurar las ubicaciones de las bibliotecas multimedia predeterminadas
3. La aplicación muestra automáticamente el contenido de las bibliotecas configuradas, categorizadas por tipo
4. El usuario busca o navega por las bibliotecas para encontrar contenido específico
5. El usuario puede:
   a. Añadir el contenido a la lista de reproducción actual
   b. Reproducir inmediatamente el contenido en el monitor secundario

**Flujo alternativo 1**:
1. Si alguna ubicación de biblioteca no es accesible, el sistema notifica al usuario y ofrece la opción de actualizar la ubicación

**Flujo alternativo 2**:
1. El usuario puede en cualquier momento acceder a la configuración para añadir, modificar o eliminar ubicaciones de bibliotecas predeterminadas

##### CU-04: Gestión de Cambios en la Configuración de Pantallas
**Actor principal**: Encargado de tecnología en reunión religiosa
**Precondiciones**: La aplicación está en funcionamiento
**Flujo básico**:
1. Durante el uso de la aplicación, se conecta un nuevo monitor al dispositivo
2. El sistema detecta automáticamente el cambio utilizando la API `window.getScreenDetails()`
3. La vista previa de monitores se actualiza mostrando el nuevo monitor
4. El sistema notifica al usuario sobre el cambio
5. El usuario puede seleccionar el nuevo monitor para la presentación si lo desea

**Flujo alternativo 1**:
1. Durante la presentación, se desconecta el monitor que estaba mostrando la ventana de presentación
2. El sistema notifica al usuario y muestra opciones para continuar
3. El usuario selecciona otro monitor disponible
4. La ventana de presentación se reabre en el monitor seleccionado

**Flujo alternativo 2**:
1. El usuario cambia la configuración de pantallas en el sistema operativo (posición, resolución, etc.)
2. La aplicación detecta los cambios y actualiza la vista previa de monitores
3. Si es necesario, ajusta la presentación para adaptarse a la nueva configuración

### 5. Historial de Revisiones
| Versión | Fecha | Descripción | Autor |
|---------|-------|-------------|-------|
| 1.0 | [Fecha actual] | Versión inicial | Claude 3.7 |
| 1.1 | [Fecha actual] | Adición de requisitos de TypeScript, bundling y entorno de desarrollo | Claude 3.7 |
| 1.2 | [Fecha actual] | Incorporación de requisitos CSS modernos y diseño responsive | Claude 3.7 |
| 1.3 | [Fecha actual] | Inclusión de requisitos de Workbox para Service Worker y caché offline | Claude 3.7 |
| 1.4 | 2026-06-10 | Decisión arquitectónica: sin paso de build. Se eliminan TypeScript, Vite y Workbox; se adoptan ESM nativo, import maps, vendorización con npm y pruebas de humo | joseph montero |
| 1.5 | 2026-06-10 | Caddy Server reemplazado por portless para HTTPS de desarrollo con URL estable | joseph montero |
| 1.6 | 2026-06-10 | `// @ts-check` y anotaciones JSDoc pasan a ser requisito obligatorio, verificados con `tsc --noEmit` antes de cada ejecución de pruebas | joseph montero |
| 1.7 | 2026-06-15 | Migración a Vite MPA con PWA activa, precache generado y política conservadora de actualización controlada por el operador | joseph montero |
