import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const mobilePhotoStore = new Map();

function mobileUploadPlugin() {
  return {
    name: 'mobile-upload-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/mobile-upload') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data.session && data.dataUrl) {
                if (!mobilePhotoStore.has(data.session)) {
                  mobilePhotoStore.set(data.session, []);
                }
                mobilePhotoStore.get(data.session).push(data.dataUrl);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
                return;
              }
            } catch (e) {}
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false }));
          });
          return;
        }

        if (req.url.startsWith('/api/mobile-poll') && req.method === 'GET') {
          const urlObj = new URL(req.url, 'http://localhost');
          const session = urlObj.searchParams.get('session');
          if (session && mobilePhotoStore.has(session) && mobilePhotoStore.get(session).length > 0) {
            const photos = mobilePhotoStore.get(session);
            mobilePhotoStore.set(session, []);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ photos }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ photos: [] }));
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), mobileUploadPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    cors: true,
    allowedHosts: true,
    proxy: {
      '/myscript-api': {
        target: 'https://cloud.myscript.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/myscript-api/, '')
      }
    }
  }
});