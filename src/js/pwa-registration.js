// @ts-check
import { registerSW } from 'virtual:pwa-register';

/**
 * @returns {boolean}
 */
function canRegisterServiceWorker() {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export function registerControlServiceWorker() {
    if (!canRegisterServiceWorker()) {
        return;
    }

    const promptRoot = document.getElementById('pwaPrompt');
    const message = document.getElementById('pwaPromptMessage');
    const reloadButton = document.getElementById('pwaPromptReload');
    const dismissButton = document.getElementById('pwaPromptDismiss');

    if (
        !(promptRoot instanceof HTMLElement) ||
        !(message instanceof HTMLElement) ||
        !(reloadButton instanceof HTMLButtonElement) ||
        !(dismissButton instanceof HTMLButtonElement)
    ) {
        return;
    }

    const promptElement = promptRoot;
    const messageElement = message;
    const reloadAction = reloadButton;
    const dismissAction = dismissButton;

    /**
     * @param {string} text
     * @param {{ reloadable: boolean, dismissLabel: string }} options
     */
    function showPrompt(text, options) {
        messageElement.textContent = text;
        reloadAction.hidden = !options.reloadable;
        reloadAction.disabled = false;
        dismissAction.textContent = options.dismissLabel;
        promptElement.hidden = false;
    }

    function hidePrompt() {
        promptElement.hidden = true;
        messageElement.textContent = '';
        reloadAction.hidden = true;
        reloadAction.disabled = false;
        dismissAction.textContent = 'Cerrar';
    }

    dismissAction.addEventListener('click', hidePrompt);

    const updateServiceWorker = registerSW({
        immediate: true,
        onOfflineReady() {
            showPrompt('La app quedó lista para abrirse sin conexión.', {
                reloadable: false,
                dismissLabel: 'Entendido',
            });
        },
        onNeedRefresh() {
            showPrompt('Hay una actualización lista. No se aplicará hasta que la aceptes.', {
                reloadable: true,
                dismissLabel: 'Más tarde',
            });
        },
        onNeedReload() {
            window.location.reload();
        },
        onRegisterError(/** @type {unknown} */ error) {
            console.error('No se pudo registrar el service worker.', error);
        },
    });

    reloadAction.addEventListener('click', async () => {
        reloadAction.disabled = true;
        messageElement.textContent = 'Aplicando actualización...';
        await updateServiceWorker(true);
    });
}

export function registerPresenterServiceWorker() {
    if (!canRegisterServiceWorker()) {
        return;
    }

    registerSW({
        immediate: true,
        onRegisterError(/** @type {unknown} */ error) {
            console.error('No se pudo registrar el service worker.', error);
        },
    });
}
