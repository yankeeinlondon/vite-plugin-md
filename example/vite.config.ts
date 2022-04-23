import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Inspect from 'vite-plugin-inspect'
import Layouts from 'vite-plugin-vue-layouts'
import Markdown from 'vite-plugin-md'
import Pages from 'vite-plugin-pages'
import prism from 'markdown-it-prism'
import Unocss from 'unocss/vite'
import Vue from '@vitejs/plugin-vue'
import type { UserConfig } from 'vite'

const markdownWrapperClasses = 'prose prose-sm m-auto text-left'

const config: UserConfig = {
  resolve: {
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  plugins: [
    Vue({
      include: ['/\.vue$/, /\.md$/'],
      reactivityTransform: true,
    }),
    Markdown({
      wrapperClasses: markdownWrapperClasses,
      headEnabled: true,
      markdownItUses: [
        prism,
      ],
    }),
    // https://github.com/hannoeru/vite-plugin-pages
    Pages({
      // pagesDir: 'src/pages',
      extensions: ['vue', 'md'],
    }),
    // https://github.com/JohnCampionJr/vite-plugin-vue-layouts
    Layouts(),

    AutoImport({
      imports: ['vue', 'vue-router', '@vueuse/head', '@vueuse/core', 'vue/macros'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      // allow auto load markdown components under `./src/components/`
      extensions: ['vue', 'md'],

      // allow auto import and register components used in markdown
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: 'src/components.d.ts',
    }),
    Unocss(),

    Inspect(),
  ],
}

export default config
