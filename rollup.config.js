import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import license from 'rollup-plugin-license';
import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';
import pkg from './package.json' with { type: 'json' };
import ts from 'typescript';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: true
      },
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: pkg.browser,
        format: 'umd',
        name: 'tricolore',
        sourcemap: true,
        globals: {
          'd3': 'd3'
        }
      }
    ],
    external: ['d3'],  // We handle d3 as an external / as a peer dependency
    plugins: [
      commonjs(),
      nodeResolve({
        browser: true,
        extensions: ['.js', '.ts', '.wasm', '.data'],
      }),
      typescript({ typescript: ts }),
      terser(),
      license({
        banner: {
          content: `
Tricolore
Copyright (C) 2025 Matthieu Viry

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
`,
          commentStyle: 'regular',
        }
      }),
    ]
  },
];
