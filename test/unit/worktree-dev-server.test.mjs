// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createPlaywrightDevServer,
    DEFAULT_PLAYWRIGHT_PORT,
    HASH_PLAYWRIGHT_PORT_BASE,
    HASH_PLAYWRIGHT_PORTS,
    hashCheckoutPort,
    parseGitWorktreeList,
    PLAYWRIGHT_PORT_ENV,
    resolveExplicitPlaywrightPort,
    selectWorktreePort,
} from '../support/worktree-dev-server.mjs';

test('git worktree list output maps each checkout to a stable Playwright port', () => {
    const worktrees = parseGitWorktreeList(`
worktree /tmp/jw-mcenter
HEAD 1111111111111111111111111111111111111111
branch refs/heads/main

worktree /tmp/jw-mcenter-worktrees/feature-a
HEAD 2222222222222222222222222222222222222222
branch refs/heads/feature-a
`);

    assert.deepEqual(worktrees, [
        '/tmp/jw-mcenter',
        '/tmp/jw-mcenter-worktrees/feature-a',
    ]);
    assert.equal(selectWorktreePort(worktrees, '/tmp/jw-mcenter'), DEFAULT_PLAYWRIGHT_PORT);
    assert.equal(selectWorktreePort(worktrees, '/tmp/jw-mcenter-worktrees/feature-a/src'), DEFAULT_PLAYWRIGHT_PORT + 1);
});

test('worktree matching requires a path boundary', () => {
    const worktrees = ['/tmp/app', '/tmp/app-2'];
    assert.equal(selectWorktreePort(worktrees, '/tmp/app-2'), DEFAULT_PLAYWRIGHT_PORT + 1);
});

test('explicit Playwright port override is validated', () => {
    assert.equal(resolveExplicitPlaywrightPort({ [PLAYWRIGHT_PORT_ENV]: '6123' }), 6123);
    assert.equal(resolveExplicitPlaywrightPort({}), null);
    assert.throws(
        () => resolveExplicitPlaywrightPort({ [PLAYWRIGHT_PORT_ENV]: 'abc' }),
        /PLAYWRIGHT_PORT must be an integer/
    );
});

test('non-git fallback ports stay in the reserved hash range', () => {
    const port = hashCheckoutPort('/tmp/not-a-git-checkout');
    assert.ok(port >= HASH_PLAYWRIGHT_PORT_BASE);
    assert.ok(port < HASH_PLAYWRIGHT_PORT_BASE + HASH_PLAYWRIGHT_PORTS);
});

test('Playwright server config uses the selected port consistently', () => {
    const devServer = createPlaywrightDevServer(DEFAULT_PLAYWRIGHT_PORT + 7);
    assert.equal(devServer.baseURL, `http://127.0.0.1:${DEFAULT_PLAYWRIGHT_PORT + 7}`);
    assert.equal(devServer.webServer.port, DEFAULT_PLAYWRIGHT_PORT + 7);
    assert.match(devServer.webServer.command, /npm run build && npm run preview -- --host 127\.0\.0\.1 --port 4324 --strictPort/);
    assert.equal(devServer.webServer.reuseExistingServer, true);
});
