import type { IElement } from 'happy-dom'
import { createTextNode, isElement } from 'happy-wrapper'
import type { CodeColorTheme, ColorByMode } from './color-types'

function left(item: string | ColorByMode) {
  return Array.isArray(item) ? item[0] : item
}
function right(item: string | ColorByMode) {
  return Array.isArray(item) ? item[1] : item
}

/**
 * Utility that merges two themes together to produce a light/dark mode theme
 */
export const mergeColorThemes = <T1 extends CodeColorTheme<any>, T2 extends CodeColorTheme<any>>(light: T1, dark: T2): CodeColorTheme<ColorByMode> => {
  const props = Array.from(new Set([...Object.keys(light), ...Object.keys(dark)]))
  return props.reduce(
    (acc, prop) => ({
      ...acc,
      [prop]: [
        left(light[prop as keyof CodeColorTheme<any>]),
        right(dark[prop as keyof CodeColorTheme<any>]),
      ] as ColorByMode,
    }),
    {} as CodeColorTheme<ColorByMode>,
  )
}

export const setCodeBlockColors = (el: HTMLElement | IElement, theme: CodeColorTheme<any>) => {
  Object.keys(theme).forEach((prop) => {
    if (isElement(el)) {
      el.append(createTextNode(`  --code-color-${prop}`))
    }
    else {
      el.style.setProperty(`--code-color-${prop}`, left(theme[prop as keyof CodeColorTheme<any>]))
      el.style.setProperty(`--dark-code-color-${prop}`, right(theme[prop as keyof CodeColorTheme<any>]))
    }
  })
}
