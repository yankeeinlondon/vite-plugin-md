import type { Document, DocumentFragment, IElement } from 'happy-dom'
import { createFragment } from './create'
import { describe, inspect } from './diagnostics'
import { HappyMishap } from './errors'
import type { HTML, MapCallback, NodeSelector, UpdateCallback } from './happy-types'
import { getChildElements } from './nodes'
import { isDocument, isElement, isFragment, isTextNode } from './type-guards'
import { clone, getNodeType, toHtml } from './utils'

/**
 * Allows the _selection_ of HTML or a container type which is
 * then wrapped and a helpful query and mutation API is provided
 * to work with this DOM element.
 */
export const select = <D extends Document | DocumentFragment | IElement | HTML>(node: D) => {
  const originIsHtml = typeof node === 'string'
  const rootNode: Document | DocumentFragment | IElement = originIsHtml
    ? createFragment(node)
    : isElement(node)
      ? node as IElement
      : isDocument(node) || isFragment(node)
        ? node
        : undefined as never

  if (!rootNode)
    throw new HappyMishap(`Attempt to select() an invalid node type: ${getNodeType(node)}`, { name: 'select(INode)', inspect: node })

  type T = undefined extends D ? DocumentFragment : D extends string ? 'html' : D
  const api: NodeSelector<T> = {
    type: () => {
      return originIsHtml
        ? 'html'
        : getNodeType(rootNode)
    },

    findAll: <S extends string | undefined>(sel: S) => {
      return sel
        ? rootNode.querySelectorAll(sel) as IElement[]
        : getChildElements(rootNode)
    },

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
      const el = selection
        ? rootNode.querySelector(selection) as IElement | null
        : isDocument(rootNode) || isFragment(rootNode)
          ? rootNode.firstElementChild
          : isElement(rootNode)
            ? rootNode
            : null

      if (!selection && el === null)
        throw new HappyMishap('Performing an update on a root selection which is a Text node is not allowed!', { name: 'update()' })
      if ((isDocument(rootNode) || isFragment(rootNode)) && (rootNode.firstElementChild !== rootNode.lastElementChild))
        throw new HappyMishap('Performing an update on a document or fragment which has more than a single element as a child is not expected! Try either updateAll() or use a DOM selection query!', { name: 'update()' })

      if (el) {
        const results = mutate(clone(el), 0, 1)
        if (isElement(results))
          el.replaceWith(results)
        else if (results === false)
          el.remove()

        else
          throw new HappyMishap(`The return value for a call to select(${getNodeType(rootNode)}).update(${selection}) return an invalid value! Value return values are an IElement or false.`, { name: 'select.update', inspect: el })
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
          let elReplacement: IElement | false
          try {
            const cloned = clone(el)
            elReplacement = mutate(cloned, idx, elements.length)
          }
          catch (e) {
            throw new HappyMishap(`updateAll(): the passed in callback to select(container).updateAll('${selection}')():  \n\n\tmutate(${describe(el)}, ${idx} idx, ${elements.length} elements)\n\n${e instanceof Error ? e.message : String(e)}.`, { name: `select(${typeof rootNode}).updateAll(${selection})(mutation fn)`, inspect: el })
          }
          // Expects an element to be returned
          if (isElement(elReplacement))
            el.replaceWith(elReplacement)

          // an explicit `false` return indicates the intent to remove
          else if (elReplacement === false)
            el.remove()
          else
            throw new HappyMishap(`The return value from the "select(container).updateAll('${selection}')(${describe(el)}, ${idx} idx, ${elements.length} elements)" call was invalid! Valid return values are FALSE or an IElement but instead got: ${typeof elReplacement}.`, { name: 'select().updateAll -> invalid return value' })
        }

        else {
          throw new Error(`Ran into an unknown node type while running updateAll(): ${JSON.stringify(inspect(el), null, 2)}`)
        }
      })

      return api
    },

    /**
     * Maps over all IElement's which match the selection criteria (or all child
     * elements if no selection provided) and provides a callback hook which allows
     * a mutation to any data structure the caller wants.
     *
     * This method is non-destructive to the parent selection captured with the
     * call to `select(dom)` and returns the map results to the caller instead of
     * continuing the selection API surface.
     */
    mapAll: <S extends string | undefined>(selection?: S) =>
      <M extends MapCallback<IElement, any>>(mutate: M) => {
        const collection: ReturnType<M>[] = []
        const elements: IElement[] = selection
          ? rootNode.querySelectorAll(selection)
          : getChildElements(rootNode)

        elements.forEach(el =>
          collection.push(mutate(clone(el))),
        )

        return collection
      },

    /**
     * Filters out `IElement` nodes out of the selected DOM tree which match
     * a particular DOM query
     */
    filter: <S extends string>(selection: S) => {
      rootNode.querySelectorAll(selection).map(el => el.remove())

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
