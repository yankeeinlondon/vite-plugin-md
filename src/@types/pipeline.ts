import type MarkdownIt from 'markdown-it'
import type { UserConfig } from 'vite'
import type { EnumValues, Frontmatter, MetaProperty, ResolvedOptions, Retain } from './core'

export enum PipelineStage {
  /**
   * Initialized with incoming filename, config, options,
   * available events (core and provided by builders).
   */
  initialize = 'initialize',
  /**
   * The **MarkdownIt** parser is initialized, all builders
   * connecting at this point will receive a valid `md` parser
   * object so that they can participate in MD-to-HTML parsing.
   */
  parser = 'parser',
  /**
   * The **MarkdownIt** parser is initialized and all builders
   * have been able to apply their customizations to it.
   */
  parserConfigured = 'parserConfigured',
  /**
   * All frontmatter has been extracted from default values and page values
   * but no mapping has been done yet.
   *
   * Note: this is the event hook which the included `meta` builder connects
   * to and it in turn _provides_ a `metaMapped` hook.
   */
  metaExtracted = 'metaExtracted',

  /**
   * SFC blocks (template, script, and an array of customBlocks) are ready for
   * builders to inspect/mutate/etc.
   */
  sfcBlocksExtracted = 'sfcBlocksExtracted',

  /**
   * All mutations of page are complete; builders can hook into this stage but
   * will _not_ be able to mutate at this stage.
   */
  closeout = 'closeout',
}

export type IPipelineStage = EnumValues<PipelineStage>
export type LifecycleHook = Exclude<EnumValues<PipelineStage>, 'initialization' | 'parserConfigured'>

/**
 * The stages of the pipeline which expose event hooks
 */
export const { initialize: _, parserConfigured: __, ...Hooks } = PipelineStage

export interface RulesUse {
  ruleName: string
  usage: 'adds' | 'patches' | 'modifies'
  description?: string
}

// export interface BuilderListener<E extends EventHook>

// identity is Payload => Payload
// with event hook: Payload & E => Payload

export type PipelineInitializer = (i?: InitializedState) => InitializedState

export interface BuilderRegistration<H extends LifecycleHook, P extends string | undefined, R extends Pipeline<H> > {
  name: string
  description?: string
  /** The lifecycle hook which this builder will respond to */
  lifecycle: H
  /**
   * If the builder provides an "event hook" for other builders to use
   * then the name of the hook must be given here (use camelCase by convention)
   */
  provides?: P
  handler: (payload: Pipeline<H>) => R

  /**
   * This isn't strictly required, but it is nice to express which rules you have used
   * modified, or added from the MarkdownIt parser.
   *
   * Note: builders should try to avoid mutating core rules; if they need a modification
   * for their purposes consider _monkey patching_ the rule so that downstream rules
   * have a better understanding of current rule state.
   */
  rules?: RulesUse[]

  /**
   * If this plugin needs to modify the configuration in some way at initialization
   * it can add a function here to do that. In most cases, the builder can simply
   * wait for their event hook to be called (at which point they will get the configuration
   * passed to them).
   */
  initialize?: PipelineInitializer
}

/** container of events organized by PipelineStage */
export type BuilderStruct<T extends string> = Record<PipelineStage | T, any>

/** the first properties which are ALWAYS available in the pipeline */
export interface InitializedState {
  fileName: string
  options: ResolvedOptions
  viteConfig: UserConfig
}

export interface AvailablePipelineProps {
  parser: MarkdownIt

  frontmatter: Frontmatter
  meta: MetaProperty[]
  head: Record<string, any>
  excerpt?: string
  markdown: string

  html: string
  script: string
  customBlocks: string[]
}

export type PipelineAvail<S extends IPipelineStage> = S extends 'initialize'
  ? string
  : S extends 'parser' | 'parserConfigured' ? Retain<AvailablePipelineProps, 'parser'>
    : S extends 'metaExtracted' ? Retain<AvailablePipelineProps, 'parser' | 'frontmatter' | 'head' | 'meta' | 'excerpt' | 'markdown'>
      : S extends 'sfcBlocksExtracted' ? AvailablePipelineProps
        : S extends 'closeout' ? Readonly<AvailablePipelineProps>
          : never

/**
 * The _state/payload_ that is available at a given stage in the pipeline process.
 *
 * - `<S>` provides the stage we're in
 * - `<E>` allows a builder to provide additional props for an event they are providing
 */
export type Pipeline<S extends IPipelineStage, E extends {} = {}> =
  Readonly<InitializedState> &PipelineAvail<S> & E

/**
 * The Builder's event listener/handler
 */
export type BuilderHandler<
  E extends LifecycleHook,
  R extends Pipeline<E> = Pipeline<E>> = (payload: E) => R

/**
 * Builder's must provide an export which meets this API constraint. Basic
 * structure of this higher order function is:
 *
 * - register( ) -> listen( ) -> payload
 */
export type BuilderApi = <E extends LifecycleHook, P extends string | undefined, R extends Pipeline<E>>(reg: BuilderRegistration<E, P, R>) => BuilderHandler<E, R>
