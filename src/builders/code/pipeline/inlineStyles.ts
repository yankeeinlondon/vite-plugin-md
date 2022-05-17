import { createInlineStyle } from 'happy-wrapper'
import type { Pipeline, PipelineStage } from '../../../types'
import type { CodeBlockMeta, CodeOptions } from '../code-types'
import { setCodeBlockColors } from '../styles/color/setCodeBlockColors'

/**
 * Applies all inline styles as VueJS <script /> blocks
 */
export const inlineStyles = (p: Pipeline<PipelineStage.parser>, o: CodeOptions) =>
  (fence: CodeBlockMeta<'dom'>): CodeBlockMeta<'dom'> => {
    if (p.codeBlockLanguages.langsRequested.length > 0) {
      const style = createInlineStyle()
        .convertToVueStyleBlock('css', false)
        .addCssVariable('code-col-width', 'auto')
        .addCssVariable('code-border-color', 'gray')
        .addClassDefinition('.code-wrapper')
        .addProps({
          'padding': '0.5rem',
          'margin-top': '0.5rem',
          'margin-bottom': '0.5rem',
          'overflow': 'hidden',
          'border-radius': '0.375rem',
          'background-color': 'var(--prism-background)',
        })
        .finish()
        .addClassDefinition('.heading', {
          'color': 'var(--prism-foreground)',
          'font-size': '1.2rem',
          'font-weight': 600,
          'padding': '0.25rem 0.5rem 0.25rem 0.5rem',
        })
        .addClassDefinition('.code-block', {
          'font-family': o.codeFont || 'var(--code-font)',
        })
        .addClassDefinition('.code-wrapper .code-block table', {
          width: '100%',
          padding: '0.375rem',
          margin: 0,
          color: 'var(--prism-foreground)',
          cursor: 'default',
        })
        .addClassDefinition('.code-wrapper table td', {
          'font-size': '0.875rem',
        })
        .addClassDefinition('.code-wrapper table td.line-number', {
          'width': 'var(--code-col-width)',
          'border': '0px',
          'opacity': '0.75',
          'padding-right': '0.75rem',
          'padding-left': '0.25rem',
          'text-align': 'right',
          'border-right': '1px solid',
          'border-color': 'var(--code-border-color)',
        })
        .addClassDefinition('.code-wrapper table td.code-line ', {
          'width': '100%',
          'white-space': 'pre',
          'border': '0px',
          'padding-top': 0,
          'padding-bottom': 0,
        })
        .addClassDefinition('.code-wrapper table tr', {
          'background-color': 'var(--prism-background)',
          'border': '0px',
          'line-height': '0.875',
        })
        .addClassDefinition('.code-wrapper table tr.odd', {
          'background-color': 'var(--prism-background)',
        })
        .addClassDefinition('.code-wrapper table tr.even', {
          'background-color': 'var(--prism-background)',
        })

      p.addStyleBlock('codeStyle', setCodeBlockColors(style, o).finish())
    }

    return fence
  }
