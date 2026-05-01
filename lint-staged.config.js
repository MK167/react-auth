export default {
  'src/**/*.{ts,tsx}': (files) => [
    `eslint --fix ${files.map((f) => `"${f}"`).join(' ')}`,
    'tsc -p tsconfig.app.json --noEmit',
  ],
};
