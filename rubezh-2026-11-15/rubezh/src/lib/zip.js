// Настоящий ZIP (STORE, CRC32) — перенос из прототипа builder.html.
function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const TABLE = crcTable();

export function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

export function makeZip(files) {
  const parts = [];
  const offs = [];
  let off = 0;
  const enc = new TextEncoder();
  files.forEach((f) => {
    const name = enc.encode(f.name);
    const data = f.data instanceof Uint8Array ? f.data : enc.encode(f.data);
    const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    offs.push({ name: f.name, crc, size: data.length, off });
    off += 30 + name.length + data.length;
  });
  const cdOff = off;
  const cd = [];
  offs.forEach((o) => {
    const h = new DataView(new ArrayBuffer(46));
    h.setUint32(0, 0x02014b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 20, true);
    h.setUint16(8, 0x0800, true);
    h.setUint32(16, o.crc, true);
    h.setUint32(20, o.size, true);
    h.setUint32(24, o.size, true);
    h.setUint16(28, o.name.length, true);
    h.setUint32(42, o.off, true);
    const n = enc.encode(o.name);
    cd.push(new Uint8Array(h.buffer), n);
    off += 46 + n.length;
  });
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true);
  eo.setUint16(8, files.length, true);
  eo.setUint16(10, files.length, true);
  eo.setUint32(12, off - cdOff, true);
  eo.setUint32(16, cdOff, true);
  parts.push(...cd, new Uint8Array(eo.buffer));
  return new Blob(parts, { type: "application/zip" });
}

export function downloadZip(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
