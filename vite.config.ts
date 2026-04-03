import { defineConfig } from "vite";
import { default as terser } from '@rollup/plugin-terser';
import dts from 'vite-plugin-dts';

export default defineConfig({
    server: {
        
    },
    build: {
        lib: {
            entry: ['src/action-history.ts'],
        },
        minify: false,
        copyPublicDir: false,
        rollupOptions: {
            external: [
                '**/*tests.ts',
                '**/*tests.js',
            ],
            output: [
                {
                    dir: 'dist',
                    entryFileNames: 'action-history.js',
                    format: 'es',
                },
                {
                    dir: 'dist',
                    entryFileNames: 'action-history.min.js',
                    format: 'es',
                    plugins: [terser()]
                },
                {
                    dir: 'dist',
                    name: 'action-history.umd.js',
                    entryFileNames: 'action-history.umd.js',
                    format: 'umd',
                },
                {
                    dir: 'dist',
                    entryFileNames: 'action-history.umd.min.js',
                    name: 'action-history.umd.min.js',
                    format: 'umd',
                    plugins: [terser()]
                }
            ]
        }
    },
    plugins: [dts({ exclude: ["**/*.test.ts", 'src/dev'], rollupTypes: true })]
});