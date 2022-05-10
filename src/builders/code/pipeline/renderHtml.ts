import { identity, pipe } from 'fp-ts/lib/function'
import { addClass, before, changeTagName, createFragment, filterClasses, into, prepend, removeClass, select, toHtml, wrap } from 'happy-wrapper'
import type { Pipeline, PipelineStage } from '../../../types'
import type { CodeBlockMeta, CodeOptions } from '../types'
import { Modifier } from '../types'

/**
 * Renders the HTML which results from the code block transform pipeline
 */
export const renderHtml = (p: Pipeline<PipelineStage.parser>, o: CodeOptions) => (fence: CodeBlockMeta<'dom'>): CodeBlockMeta<'complete'> => {
  // determine if line numbers are to be incorporated into output
  const hasLineNumbers = o.lineNumbers || fence.modifiers.includes(Modifier['#'])
  const lineNumbersWrapper = hasLineNumbers ? fence.lineNumbersWrapper : createFragment()

  /**
   * in 'flex-lines' layout we'll use a strategy similar to what is used in Vite/Vuepress:
   *
   * 1. `pre` has whitespace control but not text spacing
   * 2. line numbers are displayed _after_ the code and using absolute positioning to
   * appear next to the code
   */
  const flexLines = () => {
    fence.codeBlockWrapper = select(fence.codeBlockWrapper)
      .update(
        '.code-block',
        `Couldn't find the ".code-block" in the file ${p.fileName}`,
      )(el => into(el)(fence.pre, lineNumbersWrapper))
      .update(
        '.code-wrapper',
        `Couldn't find the ".code-wrapper" in the file ${p.fileName}`,
      )(el => fence.heading
        ? into(el)(fence.heading)
        : el,
      )
      // we'll use DIV's -- a block element -- to give PRE's whitespace
      // property jurisdiction to create a new line
      // whereas with Prism's output we're just getting SPANs
      .updateAll('.line')(el => changeTagName('div')(el))
      .toContainer()
  }

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
  const tabularFormatting = () => {
    const toTable = changeTagName('table')
    const toTD = changeTagName('td')
    const toTH = changeTagName('th')

    let lineNumber = select(fence.lineNumbersWrapper)
      .findFirst('.line-number')

    const getLineNumber = () => {
      const current = lineNumber
      if (!current)
        throw new Error('A line number node appears to be missing!')
      lineNumber = current.nextElementSibling
      return toTD(current)
    }

    const table = select(fence.pre)
      .update()(toTable)
      .update()(
        // if there's a "heading" then it will be the first row of the table
        fence.heading
          ? prepend(toTH(fence.heading.firstElementChild))
          : identity,
      )
      .updateAll('.code-line')(
        (el) => {
          const forParent: string[] = []
          return pipe(
            el,
            addClass('code-line'),
            removeClass('line'),
            filterClasses(forParent, /line--{0,1}[0-9]+/),
            toTD,
            before(getLineNumber()),
            wrap(`<tr class="${['code-row', ...forParent].join(' ')}">`),
          )
        },
      )
      .toContainer()

    const codeBlockWrapper = select(fence.codeBlockWrapper)
      .update(
        '.code-block',
        `Couldn't find the ".code-block" in the file ${p.fileName}`,
      )(codeBlock => into(codeBlock)([table]))
      .toContainer()

    return { fence, codeBlockWrapper }
  }

  switch (o.layoutStructure) {
    case 'flex-lines':
      flexLines()
      break
    case 'tabular':
      tabularFormatting()
      break
  }

  if (fence.footer)
    fence.codeBlockWrapper.lastElementChild.append(fence.footer)

  const html = toHtml(fence.codeBlockWrapper)

  return {
    ...fence,
    trace: `Finalized HTML is:\n${toHtml(fence.codeBlockWrapper)}`,

    html,
  }
}
