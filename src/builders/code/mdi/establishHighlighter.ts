// import { escapeHtml } from 'markdown-it/lib/common/utils'

import type { CodeOptions, HighlighterFunction, LineClassFn, PrismOptions } from '../code-types'
import type { PrismLanguage } from '../utils'
import { usesPrismHighlighting } from '../utils/highlighting'
import { getPrismHighlighter } from './prism'

const prism = (options: PrismOptions): HighlighterFunction<PrismLanguage> => {
  return (code: string, lang: PrismLanguage, klass: LineClassFn): string => {
    const highlight = getPrismHighlighter(options)
    return highlight(code, lang, klass)
  }
}

/**
 * Provides either **Prism** or **Shiki** as the _highlight_ function used for code
 * blocks.
 */
export const establishHighlighter = async (options: CodeOptions) =>
  usesPrismHighlighting(options)
    ? prism(options)
    : null
