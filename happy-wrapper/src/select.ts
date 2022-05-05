import type { Document, DocumentFragment, IElement } from 'happy-dom'
import { createFragment } from './create'
import { inspect } from './diagnostics'
import { HappyMishap } from './errors'
import type { Container, HTML, NodeSelector, UpdateCallback } from './happy-types'
import { getChildElements } from './nodes'
import { isDocument, isElement, isFragment, isTextNode } from './type-guards'
import { clone, getNodeType, toHtml } from './utils'

/**
 * Allows the _selection_ of HTML or a container type which is
 * then wrapped and a helpful query and mutation API is provided
 * to work with this DOM element.
 */
export const select = <D extends Container | HTML>(node: D) => {
  const originIsHtml = typeof node === 'string'
  const rootNode: Document | DocumentFragment | IElement | null = originIsHtml
    ? createFragment(node)
    : isElement(node)
      ? node as IElement
      : isDocument(node) || isFragment(node)
        ? node
        : null

  if (!rootNode)
    throw new HappyMishap(`Attempt to select() an invalid node type: ${getNodeType(node)}`, { name: 'select(INode)', inspect: node })

  type T = undefined extends D ? DocumentFragment : D extends string ? 'html' : D
  const api: NodeSelector<T> = {
    type: () => {
      return originIsHtml
        ? 'html'
        : getNodeType(rootNode)
    },

    /**
     * query for _all_ nodes with given selector
     */
    findAll: <S extends string | undefined>(sel: S) => {
      return sel
        ? rootNode.querySelectorAll(sel) as IElement[]
        : getChildElements(rootNode)
    },
    /**
     * query for the _first_ node with the given selector
     *
     * Note: by default, if nothing is found this will return `null` but
     * if you want to state an error message you may.
     */
    findFirst: <E extends string | undefined>(
      sel: string,
      errorMsg?: E): undefined extends E ? IElement | null : IElement => {
      const result = rootNode.querySelector(sel) as IElement | null
      if (!result && errorMsg)
        throw new HappyMishap(`${errorMsg}`, { name: 'select.findFirst()' })

      return result as undefined extends E ? IElement | null : IElement
    },

    /**
     * Queries for the DOM node which matches the first DOM
     * node within the DOM tree which was selected and provides
     * a callback you can add to mutate this node.
     *
     * If no selector is provided, the root selection is used as the element
     * to update.
     *
     * Note: by default if the query selection doesn't resolve any nodes then
     * this is a no-op but you can optionally express that you'd like it to
     * throw an error by setting "errorIfFound" to `true` or as a string if
     * you want to state the error message.
     */
    update: (
      selection?: string,
      errorIfNotFound: boolean | string = false,
    ) => (mutate: UpdateCallback<IElement>) => {
      const found = selection
        ? rootNode.querySelector(selection) as IElement | null
        : isDocument(rootNode) || isFragment(rootNode)
          ? rootNode.firstElementChild
          : isElement(rootNode)
            ? rootNode
            : null

      if (!selection && found === null)
        throw new HappyMishap('Performing an update on a root selection which is a Text node is not allowed!', { name: 'update()' })
      if ((isDocument(rootNode) || isFragment(rootNode)) && (rootNode.firstElementChild !== rootNode.lastElementChild))
        throw new HappyMishap('Performing an update on a document or fragment which has more than a single element as a child is not expected! Try either updateAll() or use a DOM selection query!', { name: 'update()' })

      if (found) {
        const results = mutate(clone(found), 0, 1)
        if (results)
          found.replaceWith(results)
      }
      else {
        if (errorIfNotFound) {
          throw new HappyMishap(errorIfNotFound === true
            ? `The selection "${selection}" was not found so the update() operation wasn't able to be run`
            : errorIfNotFound,
          {
            name: `select(${selection}).update(sel)`,
            inspect: ['parent node', rootNode],
          })
        }
      }

      return api
    },

    /**
     * mutate _all_ nodes with given selector; if no selector provided then
     * all child nodes will be selected.
     *
     * Note: when passing in a selector you will get based on the DOM query but
     * if nothing is passed in then you'll get the array of `IElement` nodes which
     * are direct descendants of the root selector.
     */
    updateAll: <S extends string | undefined>(selection?: S) => (mutate: UpdateCallback<IElement>) => {
      /**
         * The array of DOM nodes which have been selected.
         */
      const elements: IElement[] = (
        selection
          ? rootNode.querySelectorAll(selection)
          : getChildElements(rootNode)
      ) as IElement[]

      elements.forEach((el, idx) => {
        if (isElement(el) || isTextNode(el)) {
          try {
            const elReplacement = mutate(el, idx, elements.length)
            // if explicit return from mutate then replace the element;
            // in contrast a `void` return will _not_ replace the node but
            // it any mutations to the element will be visible on the
            // selected DOM tree.
            if (elReplacement)
              el.replaceWith(elReplacement)
          }
          catch (e) {
            throw new Error(`updateAll(): problem updating an element with the passed in callback function:  \n\t${mutate.toString()}\n\n${e instanceof Error ? e.message : String(e)}.\n${JSON.stringify(inspect(el), null, 2)}\n\nThe callback function was:`)
          }
        }
        else {
          throw new Error(`Ran into an unknown node type while running updateAll(): ${JSON.stringify(inspect(el), null, 2)}`)
        }
      })

      return api
    },

    toContainer: () => {
      return (
        originIsHtml
          ? toHtml(rootNode)
          : rootNode
      ) as undefined extends T
        ? DocumentFragment
        : T extends 'html'
          ? string
          : T
    },
  }

  return api
}
