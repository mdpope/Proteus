import fs from 'node:fs';

// Detect both atomic replacements and same-size in-place edits without reading
// file contents. Missing files have a distinct stamp; other I/O failures propagate.
export function fileStamp(files) {
  return files.map(file => {
    try {
      const stat = fs.statSync(file, { bigint: true });
      return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(':');
    } catch (error) {
      if (error.code === 'ENOENT') return 'missing';
      throw error;
    }
  }).join('|');
}
