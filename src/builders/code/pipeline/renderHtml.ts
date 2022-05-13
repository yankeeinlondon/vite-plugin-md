import { pipe } from 'fp-ts/lib/function'
import { before, changeTagName, createFragment, select, toHtml, wrap } from 'happy-wrapper'
import type { Pipeline, PipelineStage } from '../../../types'
import type { CodeBlockMeta, CodeOptions } from '../types'
import { Modifier } from '../types'
import { tabularFormatting } from './rendering/tabular'

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
  const flexLines = () => pipe(
    fence.codeBlockWrapper,
    select,
    // .code-wrapper
    s => s.update(
      '.code-block',
        `Couldn't find the ".code-wrapper" in the file ${p.fileName}`,
    )(el => fence.heading
      ? before(fence.heading)(el)
      : el,
    ),
    // wrap in PRE and line number sections
    s => s.update(
      '.code-block',
        `Couldn't find the ".code-block" in the file ${p.fileName}`,
    )(wrap(fence.pre, lineNumbersWrapper)),
    // we'll use DIV's -- a block element -- to give PRE's whitespace
    // property jurisdiction to create a new line
    // whereas with Prism's output we're just getting SPANs
    s => s.updateAll('.code-line')(changeTagName('div')),
    s => s.toContainer(),
  )

  switch (o.layoutStructure) {
    case 'flex-lines':
      fence.codeBlockWrapper = flexLines()
      break
    case 'tabular':
      fence.codeBlockWrapper = tabularFormatting(p, fence)
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
