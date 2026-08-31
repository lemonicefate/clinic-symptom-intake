import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
]);

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
  const filePath = resolve(root, `.${decodeURIComponent(requestUrl.pathname)}`);

  if (!filePath.startsWith(`${root}${sep}`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Cache-Control': 'no-store' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(4173, '127.0.0.1', () => {
  console.log('http://127.0.0.1:4173/test/browser-vectors.html');
});
