import { extract, select, toHtml } from 'happy-wrapper'
import type { IElement } from 'happy-dom'
import type { HTML } from 'happy-wrapper'
import { identity } from 'fp-ts/lib/function'
import { isVue2, transformer, wrap } from '../utils'
import type {
  ResolvedOptions,
} from '../types'

/**
 * Finds any references to `<script>` blocks and extracts it
 * from the html portion.
 */
function extractScriptBlocks(html: HTML) {
  const scripts: IElement[] = []
  const extractor = extract(scripts)
  html = select(html)
    .updateAll('script')(extractor)
    .toContainer()

  return { html, scripts: scripts.map(el => toHtml(el)) }
}

/**
 * Separates SFC blocks from within the HTML into separate variables
 */
function extractCustomBlock(html: string, options: ResolvedOptions) {
  const customBlocks: string[] = []
  let templateBlock = html
  for (const tag of options.customSfcBlocks) {
    templateBlock = templateBlock.replace(new RegExp(`<${tag}[^>]*\\b[^>]*>[^<>]*<\\/${tag}>`, 'mg'), (code) => {
      customBlocks.push(code)
      return ''
    })
  }

  return { templateBlock, customBlocks }
}

/**
 * Converts the markdown content to an HTML template and extracts both
 * the HTML and scripts.
 */
export const extractBlocks = transformer('extractBlocks', 'dom', 'sfcBlocksExtracted', (payload) => {
  // eslint-disable-next-line prefer-const
  let { options, frontmatter, head, routeMeta } = payload
  /** HTML converted back to a string */
  let html = toHtml(payload.html)
  // extract script blocks, adjust HTML
  const hoistScripts = extractScriptBlocks(html)
  html = hoistScripts.html
  const hoistedScripts: string[] = hoistScripts.scripts

  const { templateBlock, customBlocks } = extractCustomBlock(html, options)
  const blocks = {
    /** adds the lines needed to include useHead() */
    useHead: head && options.headEnabled
      ? `import { useHead } from "@vueuse/head"\n  const head = ${JSON.stringify(head)}\n  useHead(head)`
      : '',
    importDefineExpose: options.frontmatter ? 'import { defineExpose } from \'vue\'' : '',
    exposeFrontmatter: options.frontmatter && options.exposeFrontmatter
      ? `defineExpose({ frontmatter: ${JSON.stringify(frontmatter)} })`
      : '',
    /** variable declaration which must be placed in a manner that external actors can reach it */
    frontmatter: options.frontmatter && options.exposeFrontmatter
      ? `/** frontmatter meta-data for MD page **/\n  export const frontmatter = ${JSON.stringify(frontmatter)}`
      : '',
    /** returning the 'frontmatter' property for external actors using Vue3 */
    vue3CompositionReturn: options.frontmatter ? 'return { frontmatter }' : '',
    /** return 'frontmatter' on the data property for Vue2 users */
    vue2DataExport: 'export default { data() { return { frontmatter } } }',
    /** variables usable in page template */
    localVariables: Object.entries(frontmatter).reduce(
      (acc, [key, value]) => `${acc}\n${isVue2(options) ? 'export' : ''} const ${key} = ${JSON.stringify(value)}`,
      '',
    ),
    /**
     * Adds a route section (aka, custom block) in the component if needed
     */
    routeMeta: Object.keys(routeMeta || {}).length > 0
      ? `<route>{ meta: { ${JSON.stringify(routeMeta)} } }</route>\n`
      : '',
  }

  const regularScriptBlocks = hoistScripts.scripts.map(
    s => select(s).filter('script[setup]').toContainer(),
  ).filter(i => i).join('\n')
  /** all `<setup script>` blocks */
  const scriptSetupBlocks = hoistScripts.scripts.map(
    s => select(s)
      // unwrap the <script>...</script> tag and return only interior content
      .mapAll('script[setup]')(el => el.innerHTML),
  ).join('\n')
  /** userland `<setup script>` import directives */
  const importDirectives: string[] = []

  /** all userland non-import lines in `<setup script>` blocks */
  const nonImportDirectives = scriptSetupBlocks.split('\n').map((line) => {
    if (/^import/.test(line)) {
      importDirectives.push(line)
      return ''
    }
    else { return line }
  }).filter(i => i).join('\n')

  const scriptBlock = isVue2(options)
    ? [
        wrap('script', [
          blocks.localVariables,
          blocks.frontmatter,
          blocks.vue2DataExport,
        ].join('\n')),
        hoistScripts.scripts.join('\n'),
      ].filter(i => i).join('\n')
    // Vue3
    : [
        wrap('script setup', [
          importDirectives,
          blocks.useHead,
          blocks.exposeFrontmatter,
          blocks.localVariables,
          nonImportDirectives,
        ].filter(i => i).join('\n  ')),
        wrap('script', blocks.frontmatter),
        regularScriptBlocks,
        blocks.routeMeta,
      ].filter(i => i).join('\n')

  return { ...payload, html, hoistedScripts, templateBlock, scriptBlock, customBlocks }
})
