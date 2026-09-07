const fs = require('fs');
const path = require('path');

const cleanDist = () => ({
  name: 'clean-dist',
  buildStart() {
    fs.rmSync(path.resolve(__dirname, 'dist'), { recursive: true, force: true });
  },
});

module.exports = {
  input: path.resolve(__dirname, 'src/index.ts'),
  output: [{ file: 'dist/index.esm.js', format: 'esm', sourcemap: false }],
  external: [
    'react',
    'react/jsx-runtime',
    '@levi2ki/rbac-core',
    '@levi2ki/rbac-expression',
  ],
  plugins: [
    cleanDist(),
    require('@rollup/plugin-commonjs')(),
    require('@rollup/plugin-typescript')({
      tsconfig: path.resolve(__dirname, 'tsconfig.lib.json'),
      declaration: true,
    }),
  ],
};
