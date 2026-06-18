import fs from 'fs';
import { inflateSync } from 'zlib';

const path = './sample-invoice.pdf';
if (!fs.existsSync(path)) {
  console.error('sample-invoice.pdf not found');
  process.exit(2);
}
const pdf = fs.readFileSync(path);
const raw = pdf.toString('latin1');
const streamRegex = /\bstream\r?\n([\s\S]*?)\r?\nendstream/g;
let m;
let allStrings = [];
let streamIndex = 0;
while ((m = streamRegex.exec(raw)) !== null) {
  streamIndex++;
  const data = m[1];
  try {
    const inflated = inflateSync(Buffer.from(data, 'latin1'));
    const txt = inflated.toString('latin1');
    // hex tokens like <4d45...>
    const hexRegex = /<([0-9A-Fa-f]+)>/g;
    let h;
    while ((h = hexRegex.exec(txt)) !== null) {
      try {
        const buf = Buffer.from(h[1], 'hex');
        const s = buf.toString('utf8');
        if (s.trim()) allStrings.push(s.trim());
      } catch (e) {}
    }
    // literal strings in parentheses
    const parenRegex = /\(([^)]*)\)/g;
    let p;
    while ((p = parenRegex.exec(txt)) !== null) {
      if (p[1].trim()) allStrings.push(p[1].trim());
    }
  } catch (err) {
    // not compressed or cannot inflate — try to pull ascii sequences
    const plain = data;
    const asciiRegex = /[\x20-\x7E]{2,}/g;
    let a;
    while ((a = asciiRegex.exec(plain)) !== null) {
      allStrings.push(a[0]);
    }
  }
}
const uniq = [...new Set(allStrings)].filter(Boolean);
console.log('streamsFound:', streamIndex);
console.log('uniqueStringsCount:', uniq.length);
console.log('sampleStrings:', uniq.slice(0,200).join(' | '));
const checks = ['MELECH','TOTAL','PAYMENT','Official','Item','WSP','RTP','₦','Name','Qty'];
for (const c of checks) console.log(c, uniq.some(s => s.includes(c)));

// print any strings that look like product names (words longer than 3 and not generic)
const likelyProducts = uniq.filter(s => s.length > 3 && /[A-Za-z]/.test(s) && !/^(BT|ET|Tm|Tf)$/.test(s)).slice(0,200);
console.log('likelyProductsSample:', likelyProducts.join(' | '));
