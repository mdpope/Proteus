const fs = require('node:fs/promises');
const {constants} = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {randomBytes, randomUUID, timingSafeEqual} = require('node:crypto');

const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const TRAY_LIMIT = 24;
const TRAY_BYTES = 96 * 1024 * 1024;
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const JPEG = Buffer.from([255, 216, 255]);

class ScreenshotShare {
  constructor({thumbnail, onChange}) {
    this.thumbnail = thumbnail;
    this.onChange = onChange;
    this.token = randomBytes(32).toString('hex');
    this.images = new Map();
    this.receipts = new Set();
    this.bytes = 0;
  }

  list() {
    return [...this.images.values()].reverse().map(({metadata}) => metadata);
  }

  get(id) {
    const image = this.images.get(id);
    if (!image) throw Error('This screenshot is no longer in the tray.');
    return {bytes:image.bytes, name:image.metadata.name, type:image.metadata.type};
  }

  remove(id) {
    const image = this.images.get(id);
    if (!image) return;
    this.images.delete(id);
    this.bytes -= image.bytes.length;
    this.onChange(this.list(), false);
  }

  async start() {
    if (this.closed) throw Error('The Share connection is closed.');
    const server = this.server = http.createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        if (!response.headersSent) reply(response, 500, {message: 'Proteus could not attach the image. Check the chat draft before trying again.'});
      });
    });
    server.maxConnections = 8;
    server.setTimeout(15000, socket => socket.destroy());
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen({host: '127.0.0.1', port: 0, exclusive: true}, resolve);
    });
    return {version: 2, port: server.address().port, token: this.token};
  }

  async publish(bundle) {
    const resolver = path.join(bundle, 'Contents', 'Helpers', 'ProteusShareContainer');
    const {stdout} = await promisify(execFile)(resolver, [], {timeout: 5000, maxBuffer: 8192});
    const container = stdout.trim();
    if (!path.isAbsolute(container)) throw Error('The Proteus Share App Group is unavailable.');
    const directory = await fs.realpath(container);
    const descriptor = await this.start();
    const file = path.join(directory, 'proteus-screenshot-share-v2.json');
    const temporary = path.join(directory, '.share-' + randomUUID());
    try {
      await fs.writeFile(temporary, JSON.stringify(descriptor), {flag: constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, mode: 0o600});
      await fs.rename(temporary, file);
      this.file = file;
    } catch (error) {
      await fs.unlink(temporary).catch(() => {});
      this.close();
      throw error;
    }
  }

  authorized(request) {
    if (request.headers.host !== '127.0.0.1:' + this.server.address().port || request.headers.origin || request.headers['sec-fetch-site']) return false;
    const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization || '');
    return !!match && timingSafeEqual(Buffer.from(match[1], 'hex'), Buffer.from(this.token, 'hex'));
  }

  async handle(request, response) {
    if (!this.authorized(request)) return reply(response, 403, {message: 'Share access is unavailable.'});
    if (request.method !== 'POST' || request.url !== '/screenshot') return reply(response, 404, {message: 'Unknown Share request.'});
    const id = request.headers['x-proteus-screenshot'];
    if (typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return reply(response, 400, {message: 'Invalid Share request.'});
    if (this.receipts.has(id)) return reply(response, 200, {received: true});
    if (this.attaching) return reply(response, 409, {message: 'Another screenshot is being received. Try again.'});
    this.attaching = true;
    try {
      await this.receive(request, response, id);
    } finally {
      this.attaching = false;
    }
  }

  async receive(request, response, id) {
    const length = Number(request.headers['content-length']);
    const type = request.headers['content-type'];
    if (!Number.isSafeInteger(length) || length <= 8 || length > MAX_IMAGE_BYTES || !['image/png', 'image/jpeg'].includes(type)) {
      return reply(response, 413, {message: 'Share a PNG or JPEG image of up to 32 MB.'});
    }
    if (this.images.size >= TRAY_LIMIT || this.bytes + length > TRAY_BYTES) {
      return reply(response, 409, {message:'The screenshot tray is full. Remove an item in Proteus, then choose Try Again here.'});
    }
    const chunks = [];
    let received = 0;
    for await (const chunk of request) {
      received += chunk.length;
      if (received > length) return reply(response, 413, {message: 'The screenshot is larger than expected.'});
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks, received);
    const signature = type === 'image/png' ? PNG : JPEG;
    if (received !== length || !bytes.subarray(0, signature.length).equals(signature)) return reply(response, 422, {message: 'Proteus could not read this image.'});
    const preview = this.thumbnail(bytes);
    if (!preview) return reply(response, 422, {message:'Proteus could not display this image.'});
    const name = 'Screenshot.'+(type === 'image/png' ? 'png' : 'jpg');
    this.images.set(id, {bytes,metadata:{id,name,type,preview,size:length}});
    this.bytes += length;
    this.receipts.add(id);
    if (this.receipts.size > 128) this.receipts.delete(this.receipts.values().next().value);
    this.onChange(this.list(), true);
    return reply(response, 200, {received:true});
  }

  close() {
    this.closed = true;
    this.server?.close();
    this.server?.closeAllConnections();
    this.images.clear();
    this.receipts.clear();
    // A descriptor contains no screenshot or chat data. Remove only our own.
    if (this.file) void fs.readFile(this.file, 'utf8').then(value => {
      if (JSON.parse(value).token === this.token) return fs.unlink(this.file);
    }).catch(() => {});
  }
}

function reply(response, status, value) {
  response.writeHead(status, {'content-type': 'application/json', 'cache-control': 'no-store', connection: 'close'});
  response.end(JSON.stringify(value));
}

module.exports = {ScreenshotShare};
