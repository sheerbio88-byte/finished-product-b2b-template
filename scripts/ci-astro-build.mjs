/**
 * Workers Builds default is: npm ci → npx wrangler deploy (no build command).
 * dist/ is gitignored, so wrangler fails unless Astro runs first.
 * Cloudflare injects WORKERS_CI=1; local npm install skips this.
 */
import { spawnSync } from 'node:child_process';

if (process.env.WORKERS_CI !== '1') {
  process.exit(0);
}

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status === 0 ? 0 : (result.status ?? 1));
