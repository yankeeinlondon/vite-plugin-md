import { identity } from 'fp-ts/lib/function'
import { Text, Window } from 'happy-dom'
import type { Document, DocumentFragment, IElement, IText } from 'happy-dom'
import { HappyMishap } from './errors'
import type { Container, HTML } from './happy-types'
import { isElement, isElementLike, isTextNodeLike } from './type-guards'
import { clone, solveForNodeType } from './utils'

/**
 * Converts an HTML string into a Happy DOM document tree
 */
export function createDocument(body: string, head?: string): Document {
  const window = new Window()
  const document = window.document
  document.body.innerHTML = body
  if (head)
    document.head.innerHTML = head
  return document
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type FragmentFrom<_T extends Container | 'html'> = DocumentFragment

export function createFragment<C extends Container | HTML>(content?: C): FragmentFrom<C extends string ? 'html' : DocumentFragment> {
  const window = new Window()
  const document = window.document
  const fragment = document.createDocumentFragment() as DocumentFragment
  if (content)
    fragment.append(clone(content))

  return fragment as FragmentFrom<C extends string ? 'html' : DocumentFragment>
}

export const createNode = (node: Container | string): IElement | IText => {
  const frag = createFragment(node)
  if (isElementLike(frag))
    return frag.firstElementChild as IElement
  else if (isTextNodeLike(frag))
    return frag.firstChild as IText
  else
    throw new HappyMishap('call to createNode() couldn\'t be converted to IElement or IText node', { name: 'createNode()', inspect: node })
}

export function createTextNode(text?: string): IText {
  if (!text) {
    console.warn('An empty string was passed into createTextNode(); will be ignored but probably a mistake')
    return new Text('')
  }

  const frag = createFragment(text)
  if (isTextNodeLike(frag))
    return frag.firstChild as unknown as IText
  else
    throw new HappyMishap(`The HTML passed in cannot be converted to a single text node: "${text}".`, { name: 'createTextNode(text)', inspect: frag })
}

/**
 * Creates an element node and can preserve parent relationship if known
 */
export const createElementNode = (el: Container | HTML, parent?: IElement): IElement => solveForNodeType()
  .outputType<IElement>()
  .solver({
    node: (n) => {
      if (isElement(n))
        return createElementNode(n) as IElement
      else
        throw new HappyMishap('can\'t create an IElement from an INode node because it doesn\'t have a tagName property', { inspect: n })
    },
    html: (h) => {
      const frag = createFragment(h)
      if (isElementLike(frag)) {
        if (parent) {
          parent.append(frag.firstElementChild)
          return parent?.lastElementChild
        }

        return frag.firstElementChild
      }
      else { throw new HappyMishap('The HTML passed into createElementNode() is not convertible to a IElement node!', { name: 'createElementNode(html)', inspect: frag }) }
    },
    element: identity,
    text: (t) => {
      throw new HappyMishap('An IElement can not be created from a IText node because element\'s require a wrapping tag name!', { name: 'createElementNode(text)', inspect: t })
    },
    fragment: (f) => {
      if (isElementLike(f)) {
        if (parent) {
          parent.append(f.firstElementChild)
          return parent?.lastElementChild
        }

        return f.firstElementChild
      }

      else { throw new HappyMishap('Can not create an Element from passed in fragment', { name: 'createElementNode(fragment)', inspect: f }) }
    },
    document: (d) => {
      if (isElementLike(d)) {
        if (parent)
          throw new HappyMishap('A Document and a parent IElement were passed into createElementNode. This is not a valid combination!')

        return d.firstElementChild
      }

      else { throw new HappyMishap('Can not create an Element from passed in Document', { name: 'createElementNode(document)', inspect: d }) }
    },
  })(el)
