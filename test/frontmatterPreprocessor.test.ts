import { readFile } from 'fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { composeSfcBlocks } from '../src/pipeline'
import type { MetaProperty, ResolvedOptions } from '../src/@types'

const frontmatterPreprocess: ResolvedOptions['frontmatterPreprocess'] = (fm) => {
  const frontmatter = {
    title: 'default title',
    description: 'default description',
    ...fm,
  }
  const meta: MetaProperty[] = [
    { property: 'og:title', name: 'twitter:title', itemprop: 'title', content: frontmatter.title },
    {
      property: 'og:description',
      name: 'twitter:description',
      itemprop: 'description',
      content: frontmatter.description,
    },
  ]
  return {
    head: { ...frontmatter, meta },
    frontmatter: { ...frontmatter, meta },
    metaProps: [],
    routeMeta: {},
  }
}

let md = ''

describe('frontmatter pre-processor (without use of meta builder pattern)', () => {
  beforeAll(async() => {
    md = await readFile('test/fixtures/simple.md', 'utf-8')
  })

  it('frontmatter is unchanged', () => {
    const { meta } = composeSfcBlocks('', md, { frontmatterPreprocess })
    expect(meta.frontmatter).toMatchSnapshot()
  })

  it('head is unchanged', () => {
    const { meta } = composeSfcBlocks('', md, { frontmatterPreprocess })
    expect(meta.head).toMatchSnapshot()
  })

  it('meta props are unchanged', () => {
    const { meta } = composeSfcBlocks('', md, { frontmatterPreprocess })
    expect(meta.metaProps).toMatchSnapshot()
  })

  it('inline markdown is used over default properties', async() => {
    const { meta } = composeSfcBlocks('', md, { frontmatterPreprocess })

    // Positive tests
    expect(
      meta.frontmatter.title.includes('Hello World'),
      'the title attribute is retained over the default \'title\' value',
    ).toBeTruthy()

    expect(
      meta.frontmatter.description.includes('testing is the path to true happiness'),
      'description property is also retained',
    ).toBeTruthy()

    // Negative tests
    expect(
      meta.frontmatter.title.includes('default title'),
      'the title attribute is retained over the default \'title\' value',
    ).toBeFalsy()

    expect(meta.frontmatter.description.includes('default description'), 'default description is ignored').toBeFalsy()

    // Meta props
    const title = meta.head.meta.find(i => i.itemprop === 'title')
    const desc = meta.head.meta.find(i => i.itemprop === 'description')
    expect(title).toBeDefined()
    expect(desc).toBeDefined()
    expect(title?.property).toEqual('og:title')
    expect(desc?.property).toEqual('og:description')
  })
})
