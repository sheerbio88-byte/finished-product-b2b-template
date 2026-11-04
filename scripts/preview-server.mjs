// astro preview returns its own 404 for every URL that does not end in "/".
// This server redirects those URLs when the page exists, and otherwise
// serves dist/404.html so the site header and mobile bar stay in place.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve('dist');
const args = process.argv.slice(2);

function arg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const host = arg('--host', '127.0.0.1');
const startPort = Number(arg('--port', '4321')) || 4321;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveSafe(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const file = path.resolve(root, decoded.replace(/^\/+/, ''));
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (file !== root && !file.startsWith(rootPrefix)) return null;
  return file;
}

function sendFile(res, status, file) {
  const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

function sendMissing(res) {
  const file = path.join(root, '404.html');
  if (fs.existsSync(file)) sendFile(res, 404, file);
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function isFile(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

const server = http.createServer((req, res) => {
  const raw = req.url || '/';
  const queryAt = raw.indexOf('?');
  const pathname = queryAt === -1 ? raw : raw.slice(0, queryAt);
  const search = queryAt === -1 ? '' : raw.slice(queryAt);
  if (!pathname.startsWith('/') || pathname.includes('\\')) {
    sendMissing(res);
    return;
  }

  if (path.posix.extname(pathname)) {
    const file = resolveSafe(pathname);
    if (file && isFile(file)) sendFile(res, 200, file);
    else sendMissing(res);
    return;
  }

  const bare = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const dir = resolveSafe(bare);
  if (!dir) {
    sendMissing(res);
    return;
  }
  const index = path.join(dir, 'index.html');
  const htmlFile = `${dir}.html`;

  if (!pathname.endsWith('/') && pathname !== '/') {
    if (isFile(index) || isFile(htmlFile)) {
      res.writeHead(301, { Location: `${pathname}/${search}` });
      res.end();
      return;
    }
    sendMissing(res);
    return;
  }

  if (isFile(index)) {
    sendFile(res, 200, index);
    return;
  }
  if (isFile(htmlFile)) {
    sendFile(res, 200, htmlFile);
    return;
  }
  sendMissing(res);
});

let port = startPort;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && port < startPort + 20) {
    port += 1;
    server.listen(port, host);
    return;
  }
  console.error(error);
  process.exit(1);
});
server.listen(port, host, () => {
  const address = server.address();
  const actual = address && typeof address === 'object' ? address.port : port;
  console.log(`preview http://${host}:${actual}/`);
});
