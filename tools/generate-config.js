// Genera config.js a partir de .env (LOCAL).
// Uso: npm run gen-config

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('No OPENROUTER_API_KEY found in .env');
  process.exit(1);
}

const out = `window.CONFIG = { OPENROUTER_API_KEY: '${apiKey.replace(/'/g, "\\'")}' };\n`;
fs.writeFileSync(path.resolve(process.cwd(), 'config.js'), out);
console.log('config.js generated');
