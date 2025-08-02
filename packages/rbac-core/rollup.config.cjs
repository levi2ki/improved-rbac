const { withNx } = require('@nx/rollup/with-nx');
const path = require('path');

module.exports = {
    // Provide additional rollup configuration here. See: https://rollupjs.org/configuration-options
    // e.g.
    output: [
        {
            file: 'dist/index.js',
            format: 'cjs',
            sourcemap: false,
        },
        {
            file: 'dist/index.esm.js',
            format: 'esm',
            sourcemap: false,
        },
    ],
    input: path.resolve(__dirname, `src/index.ts`),
    plugins: [
        require('@rollup/plugin-commonjs')(),
        require('@rollup/plugin-typescript')({
            tsconfig: path.resolve(__dirname, 'tsconfig.lib.json'),
            declaration: true,
        }),
    ],
};
