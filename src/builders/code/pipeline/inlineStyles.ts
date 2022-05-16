import { createFragment, toHtml } from 'happy-wrapper'
import type { Pipeline, PipelineStage } from '../../../types'
import type { CodeBlockMeta, CodeOptions } from '../code-types'
import { themes } from '../styles/color/color-themes'

export const inlineStyles = (p: Pipeline<PipelineStage.parser>, o: CodeOptions) => (fence: CodeBlockMeta<'dom'>): CodeBlockMeta<'dom'> => {
  const colorTheme = o.theme && typeof o.theme === 'string'
    ? themes[o.theme]
    : typeof o.theme === 'object'
      ? o.theme
      : null

  const f = createFragment(`<style type="text/css">
    :root {
      --color-code-foreground = ${colorTheme ? colorTheme.foreground : 'white'}
      --color-code-background = ${colorTheme ? colorTheme.background : 'black'}
      --dark-color-code-foreground = ${colorTheme ? colorTheme.foreground : 'white'}
      --dark-color-code-background = ${colorTheme ? colorTheme.background : 'black'}
    }

    .code-wrapper {
      padding: 1rem;
    }
  `)

  p.head.push(toHtml(f))

  return fence
}
