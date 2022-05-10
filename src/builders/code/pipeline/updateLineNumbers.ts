import { pipe } from 'fp-ts/lib/function'
import type { DocumentFragment, IElement } from 'happy-dom'
import {
  addClass,
  before,
  createElementNode,
  inspect,
  removeClass,
  select,
  toHtml,
  wrap,
} from 'happy-wrapper'
import type { CodeBlockMeta, CodeOptions } from '../types'

const applyLineClasses = (
  fence: CodeBlockMeta<'dom'>,
  genericLineClass: string,
  aboveTheFold = 0,
) => (section: DocumentFragment) => {
  const evenOdd = (lineNumber: number) => (el: IElement) => lineNumber % 2 === 0
    ? addClass('even')(el)
    : addClass('odd')(el)

  const firstLast = (lineNumber: number) => (el: IElement) => lineNumber === 1
    ? addClass('first-row')(el)
    : lineNumber === fence.codeLinesCount
      ? addClass('last-row')(el)
      : el

  const lineNumber = (i: number) => i + 1 - aboveTheFold
  const specificLine = (i: number) => {
    return lineNumber(i) > 0 ? `line-${lineNumber(i)}` : `negative line-${Math.abs(lineNumber(i))}`
  }

  const domSelector = `.${genericLineClass.replace(/^\./, '')}`
  const s = select(section)
    .updateAll(domSelector)(
      (el, idx) => pipe(
        el,
        evenOdd(lineNumber(idx as number)),
        firstLast(lineNumber(idx as number)),
        removeClass('line'),
        addClass(specificLine(idx as number)),
      ),
    )
    .toContainer()

  return s
}

/**
 * Adds line number DOM elements for each code line; along with "above the fold"
 * lines if there are any
 */
const addLinesToContainer = (fence: CodeBlockMeta<'dom'>, o: CodeOptions, aboveTheFold = 0) => {
  return (wrapper: DocumentFragment) => {
    const children: IElement[] = []
    for (let lineNumber = 1 - aboveTheFold; fence.codeLinesCount >= lineNumber; lineNumber++) {
      /** choose the tagName based on layout config */
      const tagName = o.layoutStructure === 'flex-lines'
        ? 'div'
        : o.layoutStructure === 'tabular'
          ? 'td'
          : 'span'

      const child = createElementNode(`<${tagName} class="line-number">${lineNumber}</${tagName}>`)
      children.push(child)
    }

    return wrap(children)(wrapper)
  }
}

/**
 * - Builds up the full DOM tree for line numbers and puts it back into the
 * `fence.lineNumbersWrapper` property.
 * - Adds classes for all _lines_ nodes (e.g., even/odd, first/last, etc.), this includes
 * normal code lines and "above the fold"
 */
export const updateLineNumbers = (o: CodeOptions) =>
  (fence: CodeBlockMeta<'dom'>): CodeBlockMeta<'dom'> => {
    let linesAboveTheFold = 0
    let emptyLines = 0
    const aboveTheFoldCode = fence.aboveTheFoldCode
      ? select(fence.aboveTheFoldCode)
        .updateAll('.line-above')((el, idx, total) => {
          if (el.textContent.length === 0 || (idx === 1 && el.textContent.trim() === '//')) {
            emptyLines++
            linesAboveTheFold = (total || 0) - emptyLines
            return false
          }
          else {
            linesAboveTheFold = (total || 0) - emptyLines
            return pipe(
              el,
              addClass(['code-line']),
            )
          }
        }).toContainer()
      : undefined

    /** the code with meta-classes added and including the "aboveTheFold" code */
    const code: DocumentFragment = pipe(
      aboveTheFoldCode
        ? before(aboveTheFoldCode.firstElementChild)(fence.code)
        : fence.code,
      applyLineClasses(fence, 'code-line', linesAboveTheFold),
    )

    const lineNumbersWrapper = pipe(
      fence.lineNumbersWrapper,
      addLinesToContainer(fence, o, linesAboveTheFold),
      applyLineClasses(fence, 'line-number', linesAboveTheFold),
    )

    return {
      ...fence,
      trace: `Processed ${fence.codeLinesCount} lines and put into fence.lineNumbersWrapper [the level was at ${fence.level}]. Also merged aboveTheFold code [${linesAboveTheFold} lines] with code (if needed) and added meta classes for for each line.`,
      aboveTheFoldCode, // frozen in pipeline now that incorporated into `code`
      code,
      lineNumbersWrapper,
    }
  }
