# Contributing / Developer Guide

## Filosofía actual

No hay framework, pero sí hay build. La barra técnica ahora es esta:

1. El código de aplicación sigue siendo JS con `// @ts-check` y JSDoc.
2. Vite empaqueta la app como **MPA**, no como SPA.
3. Las dependencias del navegador salen de npm y del grafo de módulos; no se
   vendorizan en `src/vendor/`.
4. La PWA usa `vite-plugin-pwa` con `injectManifest`, porque el proyecto
   necesita controlar cuándo aplicar una actualización.
5. Todo debe seguir funcionando offline una vez instalado el service worker.
6. `dist/` debe ser determinista y auditable.

## Setup

```sh
nvm use
npm install
```

## Correr la app

```sh
npm start
```

`npm start` ejecuta Vite detrás de [portless](https://portless.sh/) para dar
HTTPS y URL estable (`https://jw-mcenter.localhost` en `main`; en worktrees,
Portless antepone el prefijo derivado de la rama).

One-time setup en una máquina nueva:

```sh
sudo npx portless proxy start --https
npx portless trust
```

El contexto seguro importa: `getScreenDetails()` y `SharedWorker` lo exigen.

## Reglas de código

### Módulos

- Mantén imports explícitos con extensión para módulos internos.
- Si un asset o worker debe pasar por Vite, usa `new URL(..., import.meta.url)`.
- No reintroduzcas import maps ni globals vendorizados.

### PWA

- El service worker fuente vive en `src/js/sw.js`.
- La configuración PWA vive en `vite.config.mjs`.
- Las actualizaciones deben seguir siendo conservadoras:
  el panel avisa, el operador decide, recién ahí se recarga.
- No agregues fallback SPA ciego. `/` y `/presentation.html` son páginas
  distintas y deben seguir siéndolo offline.

### Assets públicos

- Iconos y otros assets públicos estables van en `src/public/`.
- No dejes `.DS_Store` en assets ni en `dist/`.

### Tipado

- `npm run check` debe pasar sin errores.
- `tsconfig.worker.json` cubre el shared worker y el service worker.
- Los tipos ambient para APIs Chromium-only y módulos virtuales viven en
  `types/globals.d.ts`.

## Comandos

| Command | What it does |
|---|---|
| `npm start` | Vite dev server detrás de Portless |
| `npm run check` | Typecheck de JS/JSDoc (`tsc --noEmit`) |
| `npm run check:watch` | Typecheck continuo |
| `npm run build` | Genera `dist/` con Vite y PWA |
| `npm run preview` | Sirve `dist/` |
| `npm run test:unit` | Pruebas unitarias de Node |
| `npm run test:artifacts` | Verifica artefactos obligatorios en `dist/` |
| `npm test` | `check` + unit + build + artifacts + Playwright |

## Testing

Playwright corre contra `vite preview`, no contra `src/` crudo. Eso importa
porque el comportamiento offline y el service worker solo son reales en el
build de producción.

Los puertos de Playwright siguen siendo deterministas por worktree. Si hace
falta, sobrescribe con `PLAYWRIGHT_PORT=xxxx`.

## Layout

```text
src/         app fuente
src/public/  assets públicos estables
dist/        salida de producción
sandbox/     experimentos no integrados
test/        unit + artifacts + Playwright
```
