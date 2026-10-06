// Demo only: the app's own config, but "/" serves index.demo.html, which loads fake-core.js first.
// Nothing under src/ or the committed index.html is touched.
import { defineConfig, mergeConfig } from 'vite';
import base from '../../../../../../vite.config';

const DEMO = '/specs/003-reflection-and-history/slices/first-counted/demo/harness/index.demo.html';

export default mergeConfig(
  base,
  defineConfig({
    root: '/home/mbonnic/Cairn-worktrees/first-counted',
    plugins: [
      {
        name: 'demo-index',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url && (req.url === '/' || req.url.startsWith('/?'))) req.url = DEMO + req.url.slice(1);
            next();
          });
        },
      },
    ],
  }),
);
