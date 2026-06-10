/**
 * Copies third-party browser files from node_modules into src/vendor/.
 * The vendor folder is committed: the app must work offline with no CDN.
 *
 * This is NOT an app build step — app code under src/ is never compiled.
 * The only transformation here is flattening rxjs into a single ESM file,
 * because the rxjs npm package ships extensionless imports that browsers
 * cannot resolve natively.
 *
 * Run it only when upgrading dependencies: npm run vendor
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const VENDOR = 'src/vendor';

rmSync(VENDOR, { recursive: true, force: true });
mkdirSync(VENDOR, { recursive: true });

// Plain copies: these packages ship browser-ready dist files.
const copies = [
    ['node_modules/jquery/dist/jquery.min.js', `${VENDOR}/jquery.min.js`],
    ['node_modules/jquery-ui/dist/jquery-ui.min.js', `${VENDOR}/jquery-ui.min.js`],
    ['node_modules/jquery-ui/dist/themes/base/jquery-ui.min.css', `${VENDOR}/jquery-ui.min.css`],
    ['node_modules/jquery-ui/dist/themes/base/images', `${VENDOR}/images`],
    ['node_modules/ejs/ejs.min.js', `${VENDOR}/ejs.min.js`],
    ['node_modules/normalize.css/normalize.css', `${VENDOR}/normalize.css`],
];
for (const [from, to] of copies) {
    cpSync(from, to, { recursive: true });
}

// rxjs: flatten into one self-contained ESM file the browser can import
// via the import map entry "rxjs".
const entry = `${VENDOR}/.rxjs-entry.mjs`;
writeFileSync(entry, "export * from 'rxjs';\n");
execSync(
    `npx esbuild ${entry} --bundle --format=esm --target=es2022 --outfile=${VENDOR}/rxjs.esm.js`,
    { stdio: 'inherit' }
);
rmSync(entry);

console.log('Vendored files written to', VENDOR);
