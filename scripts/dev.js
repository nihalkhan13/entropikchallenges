/**
 * Dev server wrapper.
 * Runs `next dev --webpack` so we can use Webpack instead of Turbopack.
 * Turbopack tries to spawn a bare `node` subprocess for PostCSS/Tailwind v4
 * but the preview_start tool launches this process without nvm on PATH,
 * causing an ENOENT panic. Webpack doesn't have this issue.
 */
'use strict';

const path = require('path');

const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
process.argv = [process.argv[0], nextBin, 'dev', '--webpack'];

require(nextBin);
