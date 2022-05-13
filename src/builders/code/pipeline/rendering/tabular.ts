import { flow, identity, pipe } from 'fp-ts/lib/function'
import type { DocumentFragment, UpdateCallback_Native } from 'happy-wrapper'
import {
  addClass,
  before,
  changeTagName,
  createElement,
  describeNode,
  filterClasses,
  getParent,
  into,
  prepend,
  select,
  toHtml,
} from 'happy-wrapper'
import type { Pipeline, PipelineStage } from '../../../../types'
import type { CodeBlockMeta } from '../../types'
import { log } from '../../utils'

/**
   * In tabular structure, code looks like (where `pre` tag is replaced with `table`):
   * ```html
   * <table class="lang-xxx" data-lang="xxx">
   *    <tr class="heading"><th>heading</th></tr>
   *    <tr class="row line line-1 odd first-line">
   *      <td class="line-number">...</td>
   *      <td class="code-line">...</td>
   *    </tr>
   * </table>
   * ```
   */
export const tabularFormatting = (p: Pipeline<PipelineStage.parser>, fence: CodeBlockMeta<'dom'>): DocumentFragment => {
  const toTable = changeTagName('table')
  const toTD = changeTagName('td')
  const toTH = changeTagName('th')
  let misplaced: string[] = []
  const removed = (classes: string[]) => {
    misplaced = classes
  }
  const lineNumberElement: UpdateCallback_Native = (el, idx, _) =>
    before(`<td class="line-number">${idx + 1}</td>`)(el)

  fence.pre = pipe(
    fence.pre,
    select,
    s => s.update()(toTable),
    s => s.update()(
      // if there's a "heading" then it will be the first row of the table
      fence.heading
        ? prepend(toTH(fence.heading.firstElementChild))
        : identity,
    ),
    s => s.updateAll('.code-line')(toTD),
    s => s.updateAll('.code-line')(el =>
      pipe(
        el,
        filterClasses(removed, /line-{1,2}[0-9]/, 'odd', 'even', 'first-row', 'last-row'),
        into(pipe('<tr class="code-row">', createElement, addClass(misplaced))),
      ),
    ),
    s => s.updateAll('.code-line')(lineNumberElement),
    s => s.toContainer(),
  )

  fence.codeBlockWrapper = pipe(
    fence.codeBlockWrapper,
    select,
    s => s.update(
      '.code-block',
      `Couldn't find the ".code-block" node in the file ${p.fileName}`,
    )(into(fence.pre)),
    s => s.toContainer(),
  )

  return fence.codeBlockWrapper
}
