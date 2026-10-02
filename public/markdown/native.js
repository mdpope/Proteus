const pendingImages = new Map();
let imageSequence = 0;
const send = value => window.webkit.messageHandlers.markdown.postMessage(value);
const size = () => { if (document.getElementById('message')._markdownText !== undefined) send({ type: 'height', height: document.body.getBoundingClientRect().height }); };
const observer = new ResizeObserver(size); observer.observe(document.body);
window.updateMarkdown = text => ProteusMarkdown.mount(document.getElementById('message'), text, {
  copy: text => send({ type: 'copy', text }), link: url => send({ type: 'link', url }), resize: size,
  image: source => new Promise((resolve, reject) => { const id = String(++imageSequence); pendingImages.set(id, { resolve, reject }); send({ type: 'image', id, source }); })
});
window.imageResult = (id, dataURL) => { const pending = pendingImages.get(id); pendingImages.delete(id); if (pending) dataURL ? pending.resolve(dataURL) : pending.reject(new Error('Image unavailable')); };
