import type { Document, DocumentFragment, IElement, INode, IText } from 'happy-dom'
import type { getNodeType } from './utils'
export type InspectionTuple = [msg: string, item: unknown]

export type HTML = string

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type GetAttribute<T extends string> = <N extends Container | HTML>(node: N) => string

export type NodeTypeInput<T extends ReturnType<typeof getNodeType>> = T extends 'html'
  ? string
  : T extends 'text'
    ? IText
    : T extends 'element'
      ? IElement
      : T extends 'document'
        ? Document
        : T

export type NodeType = 'html' | 'text' | 'element' | 'node' | 'document' | 'fragment'
export type NodeSolverInput<T extends NodeType> = T extends 'html'
  ? HTML
  : T extends 'text'
    ? IText
    : T extends 'element'
      ? IElement
      : T extends 'node'
        ? INode
        : T extends 'document'
          ? Document
          : T extends 'fragment'
            ? DocumentFragment
            : unknown

export type DocRoot = Document | DocumentFragment
export type DomNode = IElement | IText | INode
export type Container = DocRoot | DomNode
export type ContainerOrHtml = Container | HTML

export interface ToHtmlOptions {
  pretty?: boolean
  indent?: number
}

export type FragWrapper = DocumentFragment | HTML
export interface BeforeAfterWrapper {
  /** put on the immediate interior of a tag */
  open?: string
  /**
   * a text node _prepended_ before the element
   */
  before?: string
  /** put before the closing tag */
  close?: string
  /**
   * A text node _appended_ after the closing tag
   */
  after?: string
  /**
   * Provides tab/space indentation based on the nesting level
   * of the element
   */
  indent?: number
}

export interface TreeSummary {
  node: string
  children: TreeSummary[]
}

export interface Tree {
  node: Container
  type: string
  level: number
  summary: () => TreeSummary
  toString: () => string

  children: Tree[]
}

/**
 * A callback which receives a node type `C` and allows side-effects and/or mutation
 */
export type UpdateCallback<C extends Container> = (container: C, idx?: number, total?: number) => C | void

export interface NodeSolverDict<O> {
  html: (input: HTML) => O extends 'mirror' ? HTML : O
  text: (input: IText) => O extends 'mirror' ? IText : O
  element: (input: IElement, parent?: IElement | DocRoot) => O extends 'mirror' ? IElement : O
  node: (input: INode) => O extends 'mirror' ? INode : O
  document: (input: Document) => O extends 'mirror' ? Document : O
  fragment: (input: DocumentFragment) => O extends 'mirror' ? DocumentFragment : O
}

/**
 * A fully configured solver which is ready to convert a node into type `O`; if `O` is never
 * then it will mirror the input type as the output type
 */
export type NodeSolverReady<E extends NodeType, O> = <N extends Exclude<Container | HTML | null, E>>(node: N, parent?: IElement | DocRoot) => O extends 'mirror'
  ? N
  : O

export interface NodeSolverReceiver<E extends NodeType, O> {
  /** provide a solver dictionary */
  solver: (solver: Omit<NodeSolverDict<O>, E>) => NodeSolverReady<E, O>
}

export interface NodeSolverWithExclusions<E extends NodeType> {
  /** provide a type which all solvers will convert to */
  outputType: <O>() => NodeSolverReceiver<E, O>
  /** the input type should be maintained as the output type */
  mirror: () => NodeSolverReceiver<E, 'mirror'>
}

/**
 * Allows you to setup a type-string utility which receives DOM containers
 * and returns either the same container type or a specific type.
 *
 * This uses a builder API, of which this is the first step.
 */
export type NodeSolver = <E extends NodeType = never>(...exclude: E[]) => NodeSolverWithExclusions<E>

/**
 * A selector API provided by using the `select()` utility
 */
export interface NodeSelector<T extends Container | 'html'> {
  /**
   * The _type_ of the root node
   */
  type: () => NodeType
  /**
   * Find the first `IElement` found using the selector string.
   *
   * Note: _by default the return type includes `null` if no results were found but if you
   * prefer to throw an error you can state the error text and an error will be thrown_
   */
  findFirst: <E extends string | undefined>(sel: string, errorMsg?: E) => undefined extends E
    ? IElement | null
    : IElement
  /**
   * Find _all_ `IElement` results returned from the Selection query
   */
  findAll: <S extends string | undefined>(sel: S) => IElement[]

  /**
   * Allows the injection of a callback which will be used to mutate on the first `IElement` node
   * which matches the first
   */
  update: <E extends string | undefined>(sel?: string, errorMsg?: E) => (cb: UpdateCallback<IElement>) => NodeSelector<T>
  /**
   * Provides a way to inject an update callback which will be applied to all IElement nodes
   * which meet the selector query. If no query is provided, then this will be all `IElement`
   * children of the root node.
   */
  updateAll: <S extends string | undefined>(sel?: S) => (cb: UpdateCallback<IElement>) => NodeSelector<T>

  /**
   * Returns the root node with all mutations included
   */
  toContainer: () => undefined extends T
    ? DocumentFragment
    : T extends 'html'
      ? string
      : T
}

