import { describe, it } from 'vitest'
import { code } from '../src/index'
import { composeFixture } from './utils'

describe('table format for code blocks', () => {
  it('a code block can be converted to use a tabular HTML output', async () => {
    const { html } = await composeFixture('ts-code-block', {
      builders: [code({
        lineNumbers: true,
        layoutStructure: 'tabular',
      })],
    })

    // eslint-disable-next-line no-console
    console.log(html)
  })
})
