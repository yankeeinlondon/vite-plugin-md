import { pipe } from 'fp-ts/lib/function'
import type { IElement, INode } from 'happy-dom'
import { createFragment } from './create'
import { HappyMishap } from './errors'
import type { Container, DocRoot, GetAttribute, HTML } from './happy-types'
import { isDocument, isElement, isFragment } from './type-guards'
import { getNodeType, solveForNodeType, toHtml } from './utils'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type SetAttribute<T extends string> = (value: string) => <N extends Container | HTML>(node: N) => N

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type SetAttributeTo<_T extends string, _V extends string> = <N extends Container | HTML>(node: N) => N

export const setAttribute = <T extends string>(
  attr: T,
): SetAttribute<T> => <V extends string>(
    value: V,
  ): SetAttributeTo<T, V> => <N extends Container | HTML>(
      node: N,
    ): N => {
    const invalidNode = (n: INode) => {
      throw new HappyMishap(`You can not use the setAttribute() utility on a node of type: "${getNodeType(n)}"`, { name: `setAttribute(${attr})(${value})(INVALID)` })
    }
    const result = solveForNodeType()
      .mirror()
      .solver({
        html: h => pipe(h, createFragment, f => setAttribute(attr)(value)(f), toHtml),
        text: t => invalidNode(t),
        node: n => invalidNode(n),
        fragment: (f) => {
          f.firstElementChild.setAttribute(attr, value)
          return f
        },
        document: (d) => {
          d.body.firstElementChild.setAttribute(attr, value)
          return d
        },
        element: (e) => {
          e.setAttribute(attr, value)
          return e
        },
      })(node)

    return result
  }

export const getAttribute = <T extends string>(attr: T): GetAttribute<T> => {
  return solveForNodeType('text', 'node')
    .outputType<string>()
    .solver({
      html: h => pipe(h, createFragment, getAttribute(attr)),
      fragment: f => f.firstElementChild.getAttribute(attr),
      document: doc => doc.body.firstElementChild.getAttribute(attr),
      element: el => el.getAttribute(attr),
    })
}

const getClass = getAttribute('class')
const setClass = setAttribute('class')
/**
 * Provides the classes defined on a given container's top level
 * element as an array of strings
 */
export const getClassList = (container: Container | HTML | null): string[] => {
  if (!container)
    return []

  return solveForNodeType().outputType<string[]>().solver({
    html: h => pipe(h, createFragment, getClassList),
    document: d => getClass(d.body.firstElementChild)?.split(/\s+/) || [],
    fragment: f => getClass(f.firstElementChild)?.split(/\s+/) || [],
    element: e => getClass(e)?.split(/\s+/) || [],
    text: (n) => { throw new HappyMishap('Passed in a text node to getClassList!', { name: 'getClassList', inspect: n }) },
    node: (n) => { throw new HappyMishap('Passed in an unknown node type to getClassList!', { name: 'getClassList', inspect: n }) },
  })(container).filter(i => i)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type RemoveClass<R extends string | string[]> = <C extends DocRoot | IElement | HTML>(container: C) => C

/**
 * Removes a class from the top level node of a container's body.
 *
 * Note: if the class wasn't present then no change is performed
 */
export const removeClass = <R extends string | string[]>(
  remove: R,
): RemoveClass<R> => <D extends DocRoot | IElement | HTML>(doc: D): D => {
  const current = getClass(doc)?.split(/\s+/g) || []
  const toRemove: string[] = !Array.isArray(remove) ? [remove] : remove

  const resultantClassString = Array.from(
    new Set<string>(current.filter(c => !toRemove.includes(c))),
  )
    .filter(i => i)
    .join(' ')

  return setClass(resultantClassString)(doc)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type AddClass<A extends string[] | string[][]> = <C extends DocRoot | IElement | HTML>(container: C) => C

/**
 * Adds a class to the top level node of a document's body.
 */
export const addClass = <A extends string[] | string[][]>(
  ...add: A
): AddClass<A> => <D extends DocRoot | IElement | HTML>(doc: D): D => {
  const toAdd = (Array.isArray(add) ? add.flat() : [add]) as string[]

  const currentClasses = getClass(doc)?.split(/\s+/g) || []
  const resultantClasses = Array.from(new Set<string>([...currentClasses, ...toAdd]))

  return setClass(resultantClasses.join(' ').trim())(doc) as D
}

export type Filter = (string | RegExp)
/**
 * an array of filters but with an array passed in as first parameter, using
 * this data structure the initial array will be treated as "memory" for the
 * class items which were removed.
 */
export type FiltersWithMemory = [string[], ...Filter[]]

function isFiltersWithMemory(filters: Filter[] | FiltersWithMemory): filters is FiltersWithMemory {
  return Array.isArray(filters[0])
}

/**
 * Filters classes out to remove from a given element. As many filters as desired may be added where a
 * filter is:
 * - string - when a string it will compare for a direct match
 * - RegExp - will run the RegExp's `test(class)` method
 *
 * Optionally you may pass in a string array property as the first parameter and this will then
 * be populated with the filtered classes.
 */
export const filterClasses = <A extends Filter[] | FiltersWithMemory>(
  ...args: A
) => <D extends DocRoot | IElement | HTML>(doc: D): D => {
  const el = isDocument(doc) || isFragment(doc)
    ? doc.firstElementChild as IElement
    : isElement(doc)
      ? doc as IElement
      : null
  if (!el)
    throw new HappyMishap('An invalid container was passed into filterClasses()!', { name: 'filterClasses', inspect: doc })

  const filters = isFiltersWithMemory(args) ? args.slice(1) as Filter[] : args as Filter[]
  const memory: string[] = isFiltersWithMemory(args) ? args[0] : []
  const classes = getClassList(el)

  classes.forEach((klass) => {
    const matched = filters.every(f => typeof f === 'string'
      ? f === klass
      : f.test(klass),
    )
    if (matched)
      memory.push(klass)
  })

  return doc
}
