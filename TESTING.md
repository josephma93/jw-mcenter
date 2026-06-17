# Testing and Manual Acceptance

## Local gates

Prerequisitos:

- Chrome 142 o más reciente.
- Dependencias instaladas con `npm install` o `npm ci`.
- Sin CI. La validación sigue siendo local.

Ejecuta:

```sh
npm test
```

Eso debe correr explícitamente:

```sh
npm run check
npm run test:unit
npm run build
npm run test:artifacts
playwright test
```

Checks enfocados:

```sh
npx playwright test --project=smoke
npx playwright test --project=multiscreen
npx playwright test --project=strict-autoplay
```

## Qué valida cada capa

- `check`: JS con `@ts-check`, JSDoc, shared worker y service worker.
- `test:unit`: lógica pura y utilidades.
- `build`: genera `dist/index.html`, `dist/presentation.html`, assets, íconos,
  `manifest.json` y `sw.js`.
- `test:artifacts`: falla si falta un artefacto obligatorio o si aparece
  `.DS_Store` en `dist/`.
- Playwright: corre contra `vite preview`, incluyendo cobertura offline.

## Cobertura offline automatizada

- El panel de control arranca offline después de que el service worker toma
  control.
- `/presentation.html` arranca offline después de que el service worker toma
  control.
- El flujo control → presentador sigue funcionando offline, incluyendo el
  SharedWorker y el envío de comandos entre ventanas.

## Manual update-flow check

Esto no debe omitirse antes de dar por bueno el comportamiento PWA:

1. Abre el panel y el presentador.
2. Instala una nueva versión del build.
3. Verifica que el panel muestre aviso de actualización.
4. Verifica que **ninguna** ventana se recargue sola durante la presentación.
5. Acepta la actualización desde el panel.
6. Verifica que recién ahí se recargue el panel.

## Manual pre-meeting checklist

Registrar una pasada manual en hardware real de doble monitor o proyector.

- Chrome 142 o más reciente.
- El portátil detecta el proyector o monitor secundario con resolución,
  orientación y escala esperadas.
- El panel de control permanece en la pantalla del operador.
- El presentador abre en la pantalla física secundaria.
- Fullscreen funciona en la pantalla secundaria.
- Un video 1080p se reproduce fluido.
- El audio es controlable desde el panel.
- Las imágenes se muestran sin recorte.
- Navegar entre medios se siente menor a 1 segundo.
- Play/pause, rewind 10s y fast-forward 10s funcionan.
- Terminar la presentación cierra la ventana del presentador.
- Cerrar el presentador actualiza el panel.
- Cerrar el panel hace que el presentador cierre en menos de 8 segundos.
- Reconfigurar pantallas a nivel OS durante la presentación queda probado y anotado.
- El aviso de actualización no fuerza reload durante una reunión.

## Manual acceptance record

```md
Date:
Tester:
Chrome version:
Laptop model / OS:
Projector or secondary display:
Resolution / scaling:
Media set used:

Local `npm test` result:

Checklist result:
- Presenter on physical secondary display:
- Fullscreen on secondary display:
- 1080p decode:
- Audio playback/control:
- Image containment:
- Media navigation under 1s:
- Play/pause and ±10s:
- End presentation:
- Presenter close updates panel:
- Panel close kills presenter within 8s:
- OS display reconfiguration:
- Update prompt waits for operator acceptance:

Notes / failures:
```

## Known limits

- La persistencia offline cubre la shell de la app y assets públicos, no una
  biblioteca durable de medios seleccionados por el usuario.
- La imagen configurada para “pantalla en blanco” sí persiste en IndexedDB.
- El hotplug avanzado de pantallas sigue dependiendo de validación manual en
  hardware real.
