import type { Document, DocumentFragment, IElement, IText } from 'happy-dom'
import { HappyMishap } from './errors'
import { createDocument, createElementNode, createFragment } from './create'
import type { Container, ContainerOrHtml, DocRoot, HTML } from './happy-types'
import { isElement, isFragment, isTextNode, isTextNodeLike } from './type-guards'
import { clone, solveForNodeType, toHtml } from './utils'

/**
 * converts a IHTMLCollection or a INodeList to an array
 */
export const getChildren = (el: Container): (IElement | IText)[] => {
  if (!el.hasChildNodes())
    return []

  const output: (IElement | IText)[] = []
  let child = el.firstChild as IElement | IText
  for (let idx = 0; idx < el.childNodes.length; idx++) {
    if (isElement(child) || isTextNode(child))
      output.push(child)
    else
      throw new HappyMishap('Unknown node type found while trying to convert children to an Array', { name: 'getChildrenAsArray', inspect: child })

    child = child.nextSibling as IElement | IText
  }

  return output
}

export const getChildElements = (el: Container): IElement[] => {
  return getChildren(el).filter(c => isElement(c)) as IElement[]
}

/**
 * Replaces an existing element with a brand new one while preserving the element's
 * relationship to the parent node (if available).
 */
export const replaceElement = (oldElement: IElement) => (newElement: IElement | HTML): IElement => {
  const parent = oldElement.parentElement
  const newEl = typeof newElement === 'string' ? createElementNode(newElement) : newElement

  if (parent) {
    const children = getChildElements(parent)
    const childIdx = children.findIndex(c => toHtml(c) === toHtml(oldElement))
    // match on first child index which produces the same HTML output
    const updated: IElement[] = (children || []).map((c, i) => i === childIdx
      ? newEl
      : c,
    )
    parent.replaceChildren(...updated)
  }
  return newEl
}

/**
 * A higher order function which starts by receiving a _wrapper_ component
 * and then is fully applied when the child nodes are passed in.
 *
 * This is the _inverse_ of the **wrap()** utility.
 *
 * ```ts
 * const sandwich = into(bread)(peanut, butter, jelly)
 * ```
 */
export const into = <P extends DocRoot | IElement | HTML | undefined>(
  /** The parent container (IElement, Document, Fragment, or even HTML) */
  parent?: P,
) => <C extends ContainerOrHtml | ContainerOrHtml[]>(
    /** Content which will be wrapped inside the parent */
    ...content: C[]
  ): undefined extends P ? DocumentFragment : P => {
  /**
   * Keeps track of whether the incoming parent was wrapped in a temp
   * fragment. This is done for HTML passed in as it's the safest way
   * to process it this way before reverting it back to HTML.
   */
  const wrapped = !!(typeof parent === 'string')
  const p: DocRoot | IElement = wrapped
    ? createFragment(parent)
    : isElement(parent)
      ? clone(parent)
      : !parent
          ? createFragment()
          : parent

  // flatten children passed in to support both arrays and destructed arrays
  const flat = content.flatMap(c => c as Container | string)

  if (isTextNodeLike(p)) {
    throw new HappyMishap(
      `The wrapper node -- when calling into() -- is wrapping a text node; this is not allowed. Parent HTML: "${toHtml(p)}"`, {
        name: 'into()',
        inspect: [
          ['parent node', parent],
        ],
      },
    )
  }

  const html = flat.map(c => toHtml(c)).join('')
  const transient = createFragment(html)
  const parentHasChildElements = p.childElementCount > 0

  if (parentHasChildElements)
    getChildren(transient).forEach(c => p.firstChild.appendChild(clone(c)))
  else
    getChildren(transient).forEach(c => p.append(c))

  return wrapped
    ? toHtml(p) as undefined extends P ? DocumentFragment : P
    : p as undefined extends P? DocumentFragment : P
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ChangeTagNameTo<T extends string> = <E extends IElement | HTML | Document | DocumentFragment>(el: E) => E

/**
 * Changes the tag name for the top level container element passed in
 * while preserving the parent node relationship.
 * ```ts
 * // <div>hi</div>
 * const html = changeTagName('div')(`<span>hi</span`)
 * ```
 */
export const changeTagName = <T extends string>(
  tagName: T,
): ChangeTagNameTo<T> => {
  /** uses regex to modify tag name to new value */
  const replacer = (el: IElement, tagName: string) => {
    const open = new RegExp(`^<${el.tagName.toLowerCase()}`)
    const close = new RegExp(`<\/${el.tagName.toLowerCase()}>$`)

    return toHtml(el)
      .replace(open, `<${tagName}`)
      .replace(close, `</${tagName}>`)
  }

  const areTheSame = (before: string, after: string) =>
    before.toLocaleLowerCase() === after.toLocaleLowerCase()

  return solveForNodeType()
    .mirror()
    .solver({
      html: (h) => {
        const before = createFragment(h).firstElementChild.tagName
        return areTheSame(before, tagName)
          ? h
          : toHtml(replacer(createFragment(h).firstElementChild, tagName))
      },
      text: (t) => {
        throw new HappyMishap('Attempt to change a tag name for a IText node. This is not allowed.', { inspect: t, name: 'changeTagName(IText)' })
      },
      node: (n) => {
        throw new HappyMishap('Attempt to change a generic INode node\'s tag name. This is not allowed.', { inspect: n, name: 'changeTagName(INode)' })
      },
      element: el => areTheSame(el.tagName, tagName)
        ? el
        : replaceElement(el)(replacer(el, tagName)),

      fragment: (f) => {
        if (f.firstElementChild)
          f.firstElementChild.replaceWith(changeTagName(tagName)(f.firstElementChild))

        else
          throw new HappyMishap('Fragment passed into changeTagName() has no elements as children!', { name: 'changeTagName(Fragment)', inspect: f })

        return f
      },
      document: (d) => {
        d.body.firstElementChild.replaceWith(
          changeTagName(tagName)(d.body.firstElementChild),
        )
        const body = toHtml(d.body)
        const head = d.head.innerHTML

        return createDocument(body, head)
      },
    })
}

/**
 * Prepends an `IElement` as the first child element of a host element.
 *
 * Note: you can use a string representation of an element
 * ```ts
 * const startWith = prepend('<h1>just do it</h1>')
 * const message: IElement = startWith(body)
 * ```
 */
export const prepend = (prepend: IElement | IText | HTML) => (el: IElement): IElement => {
  const p = typeof prepend === 'string'
    ? createFragment(prepend).firstChild
    : prepend

  el.prepend(p)
  return el
}

/**
 * Prepends an `IElement` as the first child element of a host element.
 *
 * Note: you can use a string representation of an element
 * ```ts
 * const startWith = prepend('<h1>just do it</h1>')
 * const message: IElement = startWith(body)
 * ```
 */
export const before = (before: IElement | IText | HTML) => <E extends IElement | DocumentFragment>(el: E): E => {
  const toInject = typeof before === 'string'
    ? createFragment(before).firstElementChild
    : before

  if (isElement(el) && el.parentElement)
    el.parentElement.prepend(toInject, el)
  if (isFragment(el))
    el.prepend(el)
  else
    throw new HappyMishap('No parent element found on the element passed into before() method!', { name: 'before()', inspect: el })

  return el as E
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ReadyForWrapper<_C extends ContainerOrHtml | ContainerOrHtml[]> =
  <P extends DocRoot | IElement | HTML | undefined>(
    parent: P,
  ) => undefined extends P ? DocumentFragment : P

/**
 * **wrap**
 *
 * A higher order function which receives child elements which will need
 * to be wrapped and then fully applied when it receives the singular _wrapper_
 * container.
 *
 * This is the _inverse_ of the **into()** utility.
 *
 * ```ts
 * const sandwich = wrap(peanut, butter, jelly)(bread)
 * ```
 */
export const wrap = <C extends ContainerOrHtml | ContainerOrHtml[]>(
  ...children: C[]
): ReadyForWrapper<C> => <P extends DocRoot | IElement | HTML | undefined>(
    parent?: P,
  ) => {
  return into(parent)(...children) as undefined extends P ? DocumentFragment : P
}

