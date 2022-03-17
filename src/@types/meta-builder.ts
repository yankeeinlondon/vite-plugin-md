import type { GraymatterOptions } from './core'

/**
 * The key/value definition for Route Properties.
 *
 * Note: we know that "layout" is likely and a _string_
 * but all other props are possible.
 */
export interface RouteProperties {
  layout?: string
  [key: string]: unknown
}

/**
 * A function which receives the full content of the page and
 * gives control to the function to determine what part should
 * be considered the excerpt.
 *
 * Example:
 * ```ts
 * function firstFourLines(file, options) {
 *    file.excerpt = file.content
 *      .split('\n')
 *      .slice(0, 4)
 *      .join(' ')
 * }
 * ```
 */
export type ExcerptFunction = (contents: string, options: GraymatterOptions) => string
