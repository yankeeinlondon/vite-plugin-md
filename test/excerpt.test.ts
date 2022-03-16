import { readFile } from 'fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { meta } from '../src'
import { composeSfcBlocks } from '../src/pipeline'
import type { Options } from '../src/types'

let md = ''

describe('excerpt', () => {
  beforeAll(async() => {
    md = await readFile('test/fixtures/excerpt-default.md', 'utf-8')
  })

  it('excerpt ignored in body if option set to false', async() => {
    const options: Options = { excerpt: false }
    const sfc = composeSfcBlocks('excerpt.md', md, options)

    expect(sfc.meta.frontmatter.excerpt).toBeUndefined()
  })

  it('excerpt found in body if option set to true', async() => {
    const options: Options = { excerpt: true }
    const sfc = composeSfcBlocks('excerpt.md', md, options)

    expect(sfc.meta.frontmatter.excerpt).toBeTypeOf('string')
    expect(sfc.meta.frontmatter.excerpt).toContain('The default excerpt is assumed to be the text up to')
    expect(sfc.meta.frontmatter.excerpt).not.toContain('Hello')
  })

  it('excerpt with custom separator found when specified', async() => {
    const content = await readFile('test/fixtures/excerpt-custom-sep.md', 'utf-8')
    const options: Options = { excerpt: '<!-- more -->' }
    const sfc = composeSfcBlocks('excerpt.md', content, options)

    expect(sfc.meta.frontmatter.excerpt).toBeTypeOf('string')
    expect(sfc.meta.frontmatter.excerpt).toContain('This is an excerpt')
    expect(sfc.meta.frontmatter.excerpt).not.toContain('Hello')
  })

  it('frontmatter default is overriden by body excerpt', async() => {
    const options: Options = {
      excerpt: true,
      frontmatterPreprocess: meta({
        defaults: {
          excerpt: 'this is the default',
        },
      }),
    }
    const sfc = composeSfcBlocks('excerpt.md', md, options)

    expect(sfc.meta.frontmatter.excerpt).toBeTypeOf('string')
    expect(sfc.meta.frontmatter.excerpt).toContain('The default excerpt is assumed to be the text up to')
    expect(sfc.meta.frontmatter.excerpt).not.toContain('Hello')
  })
})

describe('excerpt snapshots', () => {
  beforeAll(async() => {
    md = await readFile('test/fixtures/excerpt-default.md', 'utf-8')
  })

  it('frontmatter is consistent', () => {
    const { meta } = composeSfcBlocks('excerpt.md', md)
    expect(meta.frontmatter).toMatchSnapshot()
  })

  it('HTML is consistent', () => {
    const { html } = composeSfcBlocks('excerpt.md', md)
    expect(html).toMatchSnapshot()
  })

  it('script blocks are consistent', () => {
    const { script } = composeSfcBlocks('excerpt.md', md)
    expect(script).toMatchSnapshot()
  })

  it('custom blocks are consistent', () => {
    const { customBlocks } = composeSfcBlocks('excerpt.md', md)
    expect(customBlocks).toMatchSnapshot()
  })
})
