#!/bin/sh
set -eu
node - <<'NODE'
const fs = require('node:fs');
const config = {
  firebaseDatabaseURL: process.env.VITE_FIREBASE_DATABASE_URL || ''
};
fs.writeFileSync('dist/runtime-config.js', `window.__CINEMORPH_CONFIG__ = ${JSON.stringify(config)};\n`);
NODE
exec node dist/server.js
