/// <reference types="vitest" />
import { defineConfig } from 'vite'
import Markdown, { code, link, meta } from '../src/index'

// used for testing, library code uses TSUP to build exports
export default defineConfig(() => ({
  test: {
    dir: 'test',
  },
  plugins: [
    Markdown({ builders: [link(), meta(), code()] }),
  ],
}))
