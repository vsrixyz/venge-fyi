// Content types for the local servers.
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.md': 'text/markdown; charset=utf-8', '.csv': 'text/csv', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm'
};

export function contentType(file) {
  return TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}
