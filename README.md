# Jehovah Witnesses Multimedia Center

Aplicación web local para reuniones de Testigos de Jehová. Mantiene la
arquitectura sin framework y opera con dos entrypoints:

- `/` → panel de control
- `/presentation.html` → ventana del presentador

## Estado actual

- Vite construye una app multipágina desde `src/` hacia `dist/`.
- Las dependencias del navegador salen de npm; no hay CDNs.
- La app registra una PWA real con service worker generado mediante
  `vite-plugin-pwa` en modo `injectManifest`.
- El panel de control muestra aviso de “offline listo” y aviso de actualización.
  No recarga durante una reunión hasta que el operador acepta.
- La ventana del presentador se registra pasivamente; no fuerza recargas.

## Restricciones reales

- Chromium-only. El flujo depende de `getScreenDetails()` y `SharedWorker`.
- Local-first. Todo corre en cliente.
- `dist/` es el artefacto canónico de producción.
- La app funciona offline después de instalar el service worker.
- **No** se promete persistencia offline de medios seleccionados por el usuario:
  esos archivos siguen viviendo como blob URLs de la sesión actual, salvo la
  imagen configurada para “pantalla en blanco”, que sí se guarda en IndexedDB.

## Stack

- HTML, CSS y JavaScript con `@ts-check` + JSDoc
- Vite en modo MPA
- `vite-plugin-pwa` + Workbox (`injectManifest`)
- jQuery, RxJS, SortableJS, Pako, EJS
- Portless para HTTPS local con URL estable
- Playwright contra `vite preview`

## Estructura

- `src/index.html`: panel de control
- `src/presentation.html`: ventana del presentador
- `src/js/`: lógica de aplicación, shared worker y service worker fuente
- `src/public/`: assets públicos estables (iconos)
- `dist/`: salida de build
- `test/`: unit, artifacts y Playwright
- `sandbox/`: experimentos fuera del flujo principal

## Comandos

```sh
nvm use
npm install
npm start
```

Comandos útiles:

```sh
npm run check
npm run build
npm test
```

`npm start` levanta Vite detrás de Portless para conservar HTTPS y una URL
estable por worktree.

## Verificación

`npm test` ejecuta:

```sh
npm run check
npm run test:unit
npm run build
npm run test:artifacts
playwright test
```

La aceptación final sigue siendo una pasada manual en hardware real de doble
pantalla. Ver [TESTING.md](TESTING.md).
