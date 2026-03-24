export default {
  'src/**/*.{ts,tsx}': (files) => [
    `eslint --fix ${files.join(' ')}`,
    'tsc -p tsconfig.app.json --noEmit',
  ],
};
