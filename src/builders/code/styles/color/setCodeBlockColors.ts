import type { InlineStyle } from 'happy-wrapper'
import type { CodeOptions } from '../../code-types'
import { themes } from './color-themes'
import type { CodeColorTheme } from './color-types'
import { left, right } from './mergeColorThemes'

/**
 * Sets the color palette for light and dark mode as CSS variables
 */
export const setCodeBlockColors = (style: InlineStyle, options: CodeOptions) => {
  const { theme } = options
  const defn = typeof theme === 'string'
    ? themes[theme]
    : theme

  if (defn) {
    Object.keys(defn).forEach(
      (prop) => {
        const light = left(defn[prop as keyof CodeColorTheme<any>])
        const dark = right(defn[prop as keyof CodeColorTheme<any>])
        if (light)
          style.addCssVariable(`prism-${prop}`, light)
        if (dark)
          style.addCssVariable(`prism-${prop}`, dark, 'html.dark')

        style.addClassDefinition(`.token.${prop}`, {
          color: `var(--prism-${prop})`,
        })
      },
    )
  }

  return style
}
