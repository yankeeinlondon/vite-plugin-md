import type { Pipeline, PipelineStage } from '../../../types'
import type { CodeBlockMeta } from '../types'
import { Modifier } from '../types'

export const expandCodeBlockVariables = (
  p: Pipeline<PipelineStage.parser>,
) => (fence: CodeBlockMeta<'code'>): CodeBlockMeta<'code'> => {
  if ((p.options.escapeCodeTagInterpolation && fence.modifiers.includes(Modifier['!']))
  || (!p.options.escapeCodeTagInterpolation && !fence.modifiers.includes(Modifier['!']))) {
    const matches = fence.code.matchAll(/{{\s*(\w+)\s*}}/gs)
    for (const m of matches) {
      const [fullBlock, variable] = m

      if (variable in p.frontmatter || variable === 'frontmatter') {
        fence.code = variable === 'frontmatter'
          ? fence.code.replace(fullBlock, JSON.stringify(p.frontmatter || {}, null, 2))
          : fence.code.replace(fullBlock, JSON.stringify(p.frontmatter[variable as any] || ''))
      }
      else { fence.code = fence.code.replace(fullBlock, `Error: "${variable}" not found in frontmatter. Valid props: ${Object.keys(p.frontmatter)}`) }
    }
  }
  return {
    ...fence,
  }
}
