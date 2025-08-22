Generate config.js from .env

1. Create a `.env` file in the project root with:

OPENROUTER_API_KEY=sk-or-v1-...

2. Install dependencies:

npm install

3. Run the generator:

npm run gen-config

This creates `config.js` in the project root (which is ignored by Git). Do not commit `config.js` or your `.env`.
