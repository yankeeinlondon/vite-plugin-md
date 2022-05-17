import { createInlineStyle } from 'happy-wrapper'
import { transformer } from '../utils'

/**
 * Call's the transformer function provided in `options.before`
 */
export const baseStyling = (transformer('baseStyling', 'metaExtracted', 'metaExtracted', (p) => {
  const style = createInlineStyle()
    .addCssVariable('md-text-color', '#111827')
    .addCssVariable('md-text-color', '#e5e7eb', 'html.dark')
    .addCssVariable('md-code-background', 'rgba(27,31,35,.05)')
    .addCssVariable('md-code-background', 'rgba(229, 231, 235, 0.65)', 'html.dark')

    .addCssVariable('code-font', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace')
    .addClassDefinition(`.${p.options?.wrapperClasses}`, {
      color: 'var(--md-text-color)',
    })
    .addClassDefinition(`.${p.options?.wrapperClasses} code`, {
      fontSize: '85%',
      padding: '0.2em 0.4em',
      backgroundColor: 'var(--md-code-background)',
      borderRadius: '3px',
      fontFamily: 'var(--code-font)',
      color: '#333',
      whiteSpace: 'pre',
    })
    .addClassDefinition(`.${p.options?.wrapperClasses} blockquote`, {
      marginTop: 0,
      marginBottom: '0.25rem',
      padding: '0 1em',
      color: '#6a73737d',
      borderLeft: '0.25rem solid #dfe2e5',
    })
    .finish()

  p.addStyleBlock('baseStyle', style)

  return p
}))
