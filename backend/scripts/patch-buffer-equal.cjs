const fs = require('fs');
const path = require('path');

const targetFile = path.join(
    __dirname,
    '..',
    'node_modules',
    'buffer-equal-constant-time',
    'index.js'
);

function patch() {
    if (!fs.existsSync(targetFile)) {
        console.log('[postinstall] buffer-equal-constant-time not found, skipping patch.');
        return;
    }

    const source = fs.readFileSync(targetFile, 'utf8');

    if (source.includes("require('buffer').SlowBuffer || Buffer")) {
        console.log('[postinstall] buffer-equal-constant-time patch already applied.');
        return;
    }

    const from = "var SlowBuffer = require('buffer').SlowBuffer;";
    const to = "var SlowBuffer = require('buffer').SlowBuffer || Buffer;";

    if (!source.includes(from)) {
        console.log('[postinstall] Expected source line not found, skipping patch.');
        return;
    }

    const patched = source.replace(from, to);
    fs.writeFileSync(targetFile, patched, 'utf8');
    console.log('[postinstall] Applied Node 25 compatibility patch to buffer-equal-constant-time.');
}

patch();
