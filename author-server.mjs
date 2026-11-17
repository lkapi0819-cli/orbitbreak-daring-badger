// Authoring-time helper: receives JPEG data URLs from convert.html and writes them to disk.
// Also serves the game directory so headless Chrome can load both the game and the converter.
import { createServer } from 'node:http';
import { createReadStream, writeFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const shots = resolve(fileURLToPath(new URL('./screenshots', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
};
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const { name, data } = JSON.parse(body);
        const buf = Buffer.from(data.split(',')[1], 'base64');
        writeFileSync(join(shots, name), buf);
        res.writeHead(200).end('saved ' + buf.length);
        console.log('saved', name, buf.length);
      } catch (e) {
        res.writeHead(400).end(String(e));
      }
    });
    return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = resolve(join(root, normalize(p)));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('no'); return; }
  try {
    const st = statSync(file);
    if (!st.isFile()) throw 0;
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('not found');
  }
});
server.listen(8100, '127.0.0.1', () => console.log('authoring server on 8100'));
