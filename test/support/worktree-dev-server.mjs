// @ts-check
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const PLAYWRIGHT_PORT_ENV = 'PLAYWRIGHT_PORT';
export const DEFAULT_PLAYWRIGHT_PORT = 4317;
export const WORKTREE_PLAYWRIGHT_PORTS = 200;
export const HASH_PLAYWRIGHT_PORT_BASE = DEFAULT_PLAYWRIGHT_PORT + WORKTREE_PLAYWRIGHT_PORTS;
export const HASH_PLAYWRIGHT_PORTS = 2000;

/**
 * @param {number} port
 * @param {string} source
 */
function assertValidPort(port, source) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`${source} must be an integer between 1 and 65535.`);
    }
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizePath(value) {
    return path.resolve(value);
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {number | null}
 */
export function resolveExplicitPlaywrightPort(env) {
    const rawPort = env[PLAYWRIGHT_PORT_ENV];
    if (rawPort === undefined || rawPort === '') {
        return null;
    }

    const port = Number(rawPort);
    assertValidPort(port, PLAYWRIGHT_PORT_ENV);
    return port;
}

/**
 * @param {string} output
 * @returns {string[]}
 */
export function parseGitWorktreeList(output) {
    /** @type {string[]} */
    const worktrees = [];

    for (const line of output.split(/\r?\n/)) {
        if (!line.startsWith('worktree ')) {
            continue;
        }

        const worktreePath = line.slice('worktree '.length).trim();
        if (worktreePath) {
            worktrees.push(normalizePath(worktreePath));
        }
    }

    return worktrees;
}

/**
 * @param {string[]} worktrees
 * @param {string} cwd
 * @returns {number | null}
 */
export function selectWorktreePort(worktrees, cwd) {
    const currentPath = normalizePath(cwd);
    const sortedWorktrees = [...new Set(worktrees.map(normalizePath))].sort();
    let currentIndex = -1;
    let currentLength = -1;

    for (const [index, worktree] of sortedWorktrees.entries()) {
        const isCurrent =
            currentPath === worktree ||
            currentPath.startsWith(`${worktree}${path.sep}`);
        if (isCurrent && worktree.length > currentLength) {
            currentIndex = index;
            currentLength = worktree.length;
        }
    }

    if (currentIndex === -1) {
        return null;
    }

    if (currentIndex >= WORKTREE_PLAYWRIGHT_PORTS) {
        throw new Error(`Too many git worktrees for the reserved Playwright port range: ${currentIndex + 1}.`);
    }

    return DEFAULT_PLAYWRIGHT_PORT + currentIndex;
}

/**
 * @param {string} cwd
 * @returns {number}
 */
export function hashCheckoutPort(cwd) {
    const digest = createHash('sha256').update(normalizePath(cwd)).digest();
    const offset = digest.readUInt16BE(0) % HASH_PLAYWRIGHT_PORTS;
    return HASH_PLAYWRIGHT_PORT_BASE + offset;
}

/**
 * @param {string} cwd
 * @returns {string | null}
 */
function resolveGitTopLevel(cwd) {
    try {
        const output = execFileSync('git', ['rev-parse', '--show-toplevel'], {
            cwd,
            stdio: ['ignore', 'pipe', 'ignore'],
        }).toString().trim();
        return output || null;
    } catch {
        return null;
    }
}

/**
 * @param {string} cwd
 * @returns {string | null}
 */
function readGitWorktreeList(cwd) {
    try {
        const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
            cwd,
            stdio: ['ignore', 'pipe', 'ignore'],
        }).toString();
        return output || null;
    } catch {
        return null;
    }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {string} [cwd]
 * @returns {number}
 */
export function resolvePlaywrightPort(env = process.env, cwd = process.cwd()) {
    const explicitPort = resolveExplicitPlaywrightPort(env);
    if (explicitPort !== null) {
        return explicitPort;
    }

    const checkoutPath = resolveGitTopLevel(cwd) ?? normalizePath(cwd);
    const worktreeOutput = readGitWorktreeList(checkoutPath);
    if (worktreeOutput) {
        const worktreePort = selectWorktreePort(parseGitWorktreeList(worktreeOutput), checkoutPath);
        if (worktreePort !== null) {
            return worktreePort;
        }
    }

    return hashCheckoutPort(checkoutPath);
}

/**
 * @param {number} [port]
 * @returns {{ baseURL: string, webServer: { command: string, port: number, reuseExistingServer: boolean } }}
 */
export function createPlaywrightDevServer(port = resolvePlaywrightPort()) {
    assertValidPort(port, 'Playwright dev server port');
    return {
        baseURL: `http://127.0.0.1:${port}`,
        webServer: {
            command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
            port,
            reuseExistingServer: true,
        },
    };
}
