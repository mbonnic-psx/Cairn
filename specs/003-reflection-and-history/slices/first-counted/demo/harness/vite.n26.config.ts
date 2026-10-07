// N26 only: vite.demo.config.ts on a second port (1477), with its dependency cache under
// ~/.cache/cairn-scratch/hand-fc/, so the first Vite (1473) is left exactly as it was. The first Vite
// keeps serving its cached fake-core.js (it does not watch specs/), so ?seed=c|d|e need this one.
import { defineConfig, mergeConfig } from 'vite';
import demo from './vite.demo.config';

export default mergeConfig(
  demo,
  defineConfig({ cacheDir: '/home/mbonnic/.cache/cairn-scratch/hand-fc/vite-cache-n26' }),
);
