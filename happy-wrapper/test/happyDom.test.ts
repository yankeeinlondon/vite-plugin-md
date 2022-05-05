import { constVoid, flow, pipe } from 'fp-ts/lib/function'
import { describe, expect, it } from 'vitest'
import {
  addClass,
  changeTagName,
  clone,
  createDocument,
  createElementNode,
  createFragment,
  createTextNode,
  getChildren,
  getClassList,
  getNodeType,
  inspect,
  into,
  isElementLike,
  nodeBoundedByElements,
  nodeChildrenAllElements,
  removeClass,
  replaceElement,
  safeString,
  select,
  setAttribute,
  tab,
  toHtml,
  wrap,
} from '../src'

const tokenizedCode = `
<span class="line"><span class="token keyword">type</span> <span class="token class-name">Valid</span> <span class="token operator">=</span> <span class="token string">'foo'</span> <span class="token operator">|</span> <span class="token string">'bar'</span> <span class="token operator">|</span> <span class="token string">'baz'</span></span>
<span class="line"><span class="token keyword">const</span> testVariable<span class="token operator">:</span> Valid <span class="token operator">=</span> <span class="token string">'foo'</span></span>
<span class="line"><span class="token keyword">function</span> <span class="token function">myFunc</span><span class="token punctuation">(</span>name<span class="token operator">:</span> <span class="token builtin">string</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">\`</span><span class="token string">hello </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">\${</span>name<span class="token interpolation-punctuation punctuation">}</span></span><span class="token template-punctuation string">\`</span></span></span>
<span class="line"><span class="token punctuation">}</span></span>
`

const bareCode = `
type Valid = 'foo' | 'bar' | 'baz'
const testVariable: Valid = 'foo'
function myFunc(name: string) {
  return \`hello \${name}\`
}
`

describe('HappyDom\'s can be idempotent', () => {
  it('HTML remains unchanged when passed into and out of Document', () => {
    const d = createDocument(tokenizedCode)
    const d2 = createDocument(bareCode)
    const f = createFragment(tokenizedCode)
    const f2 = createFragment(bareCode)

    expect(toHtml(d.body.innerHTML)).toEqual(tokenizedCode)
    expect(toHtml(d2.body.innerHTML)).toEqual(bareCode)

    expect(toHtml(f)).toEqual(tokenizedCode)
    expect(toHtml(f2)).toEqual(bareCode)
  })

  it('HTML remains unchanged when passed into and out of DocumentFragment', () => {
    const html1 = createFragment(tokenizedCode)
    const html2 = createFragment(bareCode)
    const html3 = createFragment('\n\t<span>foobar</span>\n')

    expect(toHtml(html1)).toEqual(tokenizedCode)
    expect(toHtml(html2)).toEqual(bareCode)
    expect(toHtml(html3)).toEqual('\n\t<span>foobar</span>\n')

    expect(toHtml(createFragment(bareCode))).toEqual(bareCode)
  })

  it('basics', () => {
    const open = '<div class="wrapper">'
    const html = '<span>foobar</span>'
    const frag = createFragment(html)
    const openFrag = createFragment(open)

    expect(isElementLike(frag)).toBeTruthy()
    expect(isElementLike(openFrag)).toBeTruthy()

    expect(toHtml(frag.firstElementChild)).toBe(html)
    expect(frag.textContent).toBe('foobar')
    expect(frag.childNodes.length, 'HTML results in single child node').toBe(1)
    expect(frag.firstElementChild).not.toBeNull()
    expect(frag.firstElementChild).toBe(frag.lastElementChild)
    expect(frag.firstElementChild.tagName).toBe('SPAN')
    expect(frag.firstChild, 'node and element are equivalent').toBe(frag.firstElementChild)

    const text = 'hello world'
    const frag2 = createFragment(text)
    expect(frag2.textContent).toBe(text)
    expect(frag2.childNodes.length, 'text node results in single child node').toBe(1)
    expect(frag2.childNodes[0].hasChildNodes()).toBeFalsy()
    expect(frag2.firstElementChild).toBeNull()
    expect(frag2.firstChild).not.toBeNull()
    expect(frag2.firstChild.textContent).toBe(text)

    const hybrid = 'hello <span>world</span>'
    const frag3 = createFragment(hybrid)
    expect(frag3.textContent).toBe(text)
    expect(frag3.childNodes.length, 'hybrid node results two child nodes').toBe(2)
    expect(frag3.firstElementChild, 'hybrid has a "first element"').not.toBeNull()
    expect(frag3.firstChild, 'hybrid frag has a child').not.toBeNull()
    expect(frag3.firstChild.childNodes.length, 'hybrid firstChild node has children').not.toBeNull()
    expect(frag3.lastChild).toBe(frag3.lastElementChild)
    frag3.prepend('\n')
    frag3.lastElementChild.append('\n')
    expect(frag3.textContent).toBe('\nhello world\n')

    const siblings = '<span>one</span><span>two</span><span>three</span>'
    const frag4 = createFragment(siblings)
    expect(frag4.textContent).toBe('onetwothree')
    expect(frag4.childNodes).toHaveLength(3)
    expect(frag4.firstElementChild.textContent).toBe('one')
    frag4.firstElementChild.prepend('\n')
    frag4.lastElementChild.append('\n')
    expect(frag4.textContent).toBe('\nonetwothree\n')
    expect(nodeBoundedByElements(frag4)).toBeTruthy()
    expect(nodeChildrenAllElements(frag4)).toBeTruthy()

    const middling = '<span>one</span>two<span>three</span>'
    const frag5 = createFragment(middling)
    expect(frag5.textContent).toBe('onetwothree')
    expect(frag5.childNodes).toHaveLength(3)
    expect(frag5.firstElementChild.textContent).toBe('one')
    frag5.firstElementChild.prepend('\n')
    frag5.lastElementChild.append('\n')
    expect(frag5.textContent).toBe('\nonetwothree\n')
    expect(nodeBoundedByElements(frag5)).toBeTruthy()
    expect(nodeChildrenAllElements(frag5)).toBeFalsy()

    const textNode = createTextNode('hello')
    expect(textNode.hasChildNodes()).toBeFalsy()
  })

  it('changeTag() utility works as expected atomically with different container types', () => {
    const html = '<span class="foobar">hello world</span>'
    const toDiv = changeTagName('div')
    // html
    expect(toDiv(html)).toBe('<div class="foobar">hello world</div>')
    // element
    expect(toHtml(toDiv(createElementNode(html)))).toBe('<div class="foobar">hello world</div>')
    // fragment
    const f1 = createFragment(html)
    const f = toDiv(f1)
    expect(toHtml(f)).toBe('<div class="foobar">hello world</div>')
  })

  it('replaceElement() can replace an element while preserving parental relationship', () => {
    const html = '<div class="parent"><span class="foobar">hello world</span></div>'
    const onlySpan = html.replace(/div/g, 'span')
    const onlyDiv = html.replace(/span/g, 'div')
    const outside = replaceElement(createElementNode(html))(createElementNode(onlySpan))
    // basic replacement where parent is not defined
    expect(toHtml(outside), onlySpan)

    const parent = createElementNode(html)
    const staticReplacement = createElementNode('<div class="foobar">hello world</div>')
    const toDiv = changeTagName('div')
    const interior = select(clone(parent))
      .updateAll('.foobar')(el => el.replaceWith(staticReplacement))
      .toContainer()
    expect(toHtml(interior)).toBe(onlyDiv)

    const interior2 = select(clone(parent))
      .updateAll('.foobar')(el => el.replaceWith(toDiv(el)))
      .toContainer()
    expect(toHtml(interior2)).toBe(onlyDiv)
  })

  it('changeTag() can preserve parent node', () => {
    const toDiv = changeTagName('div')
    expect(toDiv('<span class="foobar">hello world</span>')).toBe('<div class="foobar">hello world</div>')

    const html = '<div class="parent"><span class="foobar">hello world</span></div>'
    const updated = select(html).updateAll('.foobar')(toDiv).toContainer()
    expect(updated).toBe('<div class="parent"><div class="foobar">hello world</div></div>')
  })

  it('select() utility\'s find functionality', () => {
    const html = '<span class="foo bar">foobar</span>'
    const frag = createFragment(html)
    const missing = select(frag).findFirst('.nonsense')
    const bunchANothing = select(frag).findAll('.nonsense')

    expect(missing).toBe(null)
    expect(bunchANothing).toHaveLength(0)
  })

  it('select() utility\'s updateAll functionality', () => {
    const html = `
    <div class='wrapper'>
      <span class='line line-1'>1</span>
      <span class='line line-2'>2</span>
      <span class='line line-3'>3</span>
    </div>
    `
    const updated = select(html)
      .updateAll('.line')(changeTagName('div'))
      .toContainer()
    const found = select(updated).findAll('.line')

    expect(found).toHaveLength(3)
    const tags = found.map(f => f.tagName.toLowerCase())
    tags.forEach(t => expect(t).toBe('div'))
  })

  it('update() and updateAll() utility works as expected', () => {
    const html = `
    <div class="wrapper">
      <span class="line line-1">1</span>
      <span class="line line-2">2</span>
      <span class="line line-3">3</span>
    </div>
    `
    const toDiv = changeTagName('div')
    const toTable = changeTagName('table')
    const toTR = changeTagName('tr')

    const selector = select(html)

    const updatedViaReplacement = select(html)
      .updateAll('.line')(toDiv)
      .toContainer()

    expect(updatedViaReplacement).toBe(html.replace(/span/g, 'div'))

    const updatedViaTree = selector
      .updateAll('.line')(flow(toDiv, constVoid))
      .toContainer()

    expect(updatedViaTree).toBe(html.replace(/span/g, 'div'))

    const table = select(html)
      .update('.wrapper')(toTable)
      .updateAll('.line')(toTR)
      .toContainer()

    expect(table).toBe(`
    <table class="wrapper">
      <tr class="line line-1">1</tr>
      <tr class="line line-2">2</tr>
      <tr class="line line-3">3</tr>
    </table>
    `)

    // test other containers
    const updatedFrag = select(createFragment(html))
      .updateAll('.line')(toDiv)
      .toContainer()
    expect(toHtml(updatedFrag)).toBe(html.replace(/span/g, 'div'))

    const updatedElement = select(createElementNode(html.trim()))
      .updateAll('.line')(toDiv)
      .toContainer()
    expect(toHtml(updatedElement)).toBe(html.trim().replace(/span/g, 'div'))
  })

  it('createFragment() utility', () => {
    const text = 'foobar'
    const html = '<span>foobar</span>'

    expect(toHtml(createFragment(html)), 'plain html').toBe(html)
    expect(toHtml(createFragment(createElementNode(html))), 'html as element').toBe(html)
    expect(toHtml(createFragment(text)), 'plain text').toBe(text)
    expect(toHtml(createFragment(createTextNode(text))), 'text as text node').toBe(text)
  })

  it('into() with multiple nodes injected', () => {
    const wrapper = '<div class="my-wrapper"></div>'
    const indent = '\n\t'
    const text = 'hello'
    const element = '<span>world</span>'
    const closeout = '\n'
    const html = `${indent}${text}${element}${closeout}`

    expect(
      into(wrapper)(indent, text, element, closeout),
      'HTML wrapper passed in returns HTML with children inside',
    ).toBe(`<div class="my-wrapper">${html}</div>`)
    expect(
      into(wrapper)([indent, text, element, closeout]),
      'Children can be passed as an array too with no change in behavior',
    ).toBe(`<div class="my-wrapper">${html}</div>`)
    // try as a fragment
    const f = into(createFragment(wrapper))(indent, text, element, closeout)
    expect(
      toHtml(f),
      `HTML wrapper passed in returns HTML with children inside, instead got:\n${inspect(f, true)}`,
    ).toBe(`<div class="my-wrapper">${html}</div>`)
    // try as an IElement
    const el = into(createElementNode(wrapper))(indent, text, element, closeout)
    expect(
      toHtml(el),
      `HTML wrapper passed in returns HTML with children inside, instead got:\n${inspect(el, true)}`,
    ).toBe(`<div class="my-wrapper">${html}</div>`)

    const emptyParent = into()(indent, text, element, closeout)
    expect(toHtml(emptyParent)).toBe(html)
    // first two text elements are folded into one
    expect(
      emptyParent.childNodes,
      `\nchild nodes were: ${getChildren(emptyParent).map(c => getNodeType(c)).join(', ')}\n`,
    ).toHaveLength(3)

    expect(
      toHtml(into('<div class="wrapper">')(indent, text, element, closeout)),
    ).toBe(`<div class="wrapper">${html}</div>`)
  })

  it('wrap() works as expected', () => {
    const html = '<span>foobar</span>'
    const text = 'foobar'
    const siblings = '<span>one</span><span>two</span><span>three</span>'
    const middling = '<span>one</span>two<span>three</span>'
    const wrapper = createFragment('<div class="wrapper" />')

    const wrapHtml = wrap(html)
    const w1 = wrapHtml(clone(wrapper))
    expect(toHtml(w1)).toBe(`<div class="wrapper">${html}</div>`)

    const w2 = wrap(text)(clone(wrapper))
    expect(toHtml(w2)).toBe(`<div class="wrapper">${text}</div>`)

    const w3 = wrap(siblings)(clone(wrapper))
    expect(toHtml(w3)).toBe(`<div class="wrapper">${siblings}</div>`)

    const w4 = wrap(middling)(clone(wrapper))
    expect(toHtml(w4)).toBe(`<div class="wrapper">${middling}</div>`)
  })

  it('setAttribute() utility', () => {
    const html = '<span>foo</span>'
    const frag = createFragment('<span>foo</span>')
    const setFoo = setAttribute('class')('foo')
    setFoo(frag)
    const html2 = setFoo(html)

    expect(toHtml(frag)).toBe('<span class="foo">foo</span>')
    expect(toHtml(html2)).toBe('<span class="foo">foo</span>')
  })

  const addOne = addClass('one')
  const addTwo = addClass('two')

  it('addClass() utility is able to add a class to the top-most node in Document', () => {
    const html = '<div class="foobar">testing</div>'
    const doc = createDocument(html)
    const plusOne = pipe(doc, addOne)
    const plusTwo = pipe(clone(plusOne), addTwo)

    expect(pipe(plusOne, getClassList), `Class list from Frag input is: ${pipe(plusOne, getClassList)}`).length(2)
    expect(pipe(plusOne, getClassList)).contains('one')
    expect(pipe(plusOne, getClassList)).not.contains('two')

    expect(pipe(plusTwo, getClassList)).length(3)
    expect(pipe(plusTwo, getClassList)).contains('one')
    expect(pipe(plusTwo, getClassList)).contains('two')
  })

  it('addClass() utility is able to add a class to the top-most node in DocumentFragment', () => {
    const html = '<div class="foobar">testing</div>'
    const frag = createFragment(html)
    const plusOne = pipe(frag, addOne)
    const plusTwo = pipe(clone(plusOne), addTwo)

    expect(pipe(plusOne, getClassList), `Class list from Frag input is: ${pipe(plusOne, getClassList)}`).length(2)
    expect(pipe(plusOne, getClassList)).contains('one')
    expect(pipe(plusOne, getClassList)).not.contains('two')

    expect(pipe(plusTwo, getClassList)).length(3)
    expect(pipe(plusTwo, getClassList)).contains('one')
    expect(pipe(plusTwo, getClassList)).contains('two')
  })

  it('addClass() utility is able to add a class to the top-most node in an IElement', () => {
    const html = '<div class="foobar">testing</div>'
    const el = createElementNode(html)
    const plusOne = pipe(el, addOne)
    const plusTwo = pipe(clone(plusOne), addTwo)

    expect(pipe(plusOne, getClassList)).length(2)
    expect(pipe(plusOne, getClassList)).contains('one')
    expect(pipe(plusOne, getClassList)).not.contains('two')

    expect(pipe(plusTwo, getClassList)).length(3)
    expect(pipe(plusTwo, getClassList)).contains('one')
    expect(pipe(plusTwo, getClassList)).contains('two')
  })

  it('removeClass() utility removes classes from DOM tree', () => {
    const starting = createFragment('<div class="foobar">testing</div>')
    const removeFoobar = removeClass('foobar')
    const removeOne = removeClass('one')

    const stillStanding = pipe(starting, removeOne)
    const empty = pipe(clone(stillStanding), removeFoobar)

    expect(pipe(stillStanding, getClassList)).toContain('foobar')
    expect(pipe(empty, getClassList)).lengthOf(0)
  })

  it('safeString', () => {
    const t1 = 'hi there'
    const t2 = '<div>hi there</div>'
    const t3 = '5 is > 4'
    const t4 = 'hi <span>there</span>'
    expect(safeString(t1)).toBe(t1)
    expect(safeString(t2)).toBe('hi there')
    expect(safeString(t3)).toBe(t3)
    expect(safeString(t4)).toBe('hi there')
  })
})
