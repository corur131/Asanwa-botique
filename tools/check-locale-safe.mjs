import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'server.ts'].map((item) => path.resolve(item));
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const unsafePattern = /(?<!\?)\.toLocaleString\s*\(/g;
const violations = [];

function inspect(file) {
  const text = fs.readFileSync(file, 'utf8');
  unsafePattern.lastIndex = 0;
  for (const match of text.matchAll(unsafePattern)) {
    const line = text.slice(0, match.index).split('\n').length;
    violations.push(path.relative(process.cwd(), file) + ':' + line + ' contains an unguarded .toLocaleString() call');
  }
}

function walk(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (extensions.has(path.extname(target))) inspect(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    walk(path.join(target, entry.name));
  }
}

for (const root of roots) walk(root);
if (violations.length) {
  console.error('Unsafe numeric/date formatting calls found:');
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Locale safety check passed: every .toLocaleString() call uses optional chaining.');
}
