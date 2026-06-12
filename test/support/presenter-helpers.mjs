// @ts-check

/**
 * @param {import('@playwright/test').Page} presenter
 * @param {'VIDEO' | 'AUDIO' | 'IMG'} tagName
 */
export async function waitForPresenterElement(presenter, tagName) {
    await presenter.waitForFunction((expectedTagName) => {
        const element = document.querySelector('#media-container > *');
        return element?.tagName === expectedTagName;
    }, tagName);
    return presenter.getByTestId('state:presenter-media').locator('> *');
}
