import { relative } from 'path'
import type { CallSite } from 'callsites'
import callsites from 'callsites'
import { inspect } from './diagnostics'
import { isHappyWrapperError, isInspectionTuple } from './type-guards'

const showCallsite = (cs: CallSite | undefined) => cs
  ? `\n  - ${cs.getFunctionName() || cs.getMethodName() || cs.getFunction() || ''}${relative(process.cwd(), cs.getFileName() || '')}:${cs.getLineNumber() || '-'}`
  : ''

export class HappyMishap extends Error {
  public name = 'HappyWrapper'
  public readonly kind: 'HappyWrapper' = 'HappyWrapper'
  public trace: string[] = []
  public readonly line: number | null
  public readonly fn: string
  public readonly file: string
  public readonly structuredStack: CallSite[]
  constructor(
    message: string,
    options: {
      error?: unknown
      inspect?: unknown
      name?: string
    } = {}) {
    super()
    this.message = `\n${message}`
    if (options.name)
      this.name = `HappyWrapper::${options.name}`

    this.structuredStack = this.structuredStack = callsites().slice(1) || []
    this.fn = this.structuredStack[0].getFunctionName() || this.structuredStack[0].getMethodName() || 'unknown'
    this.file = this.structuredStack[0].getFileName() || 'unknown'
    this.line = this.structuredStack[0].getLineNumber()

    // proxy if already a HappyWrapper
    if (isHappyWrapperError(options.error))
      this.name = `HappyWrapper::${options.name || options.error.name}`

    if (options.error) {
      const name = options.error instanceof Error
        ? options.error.name.replace('HappyWrapper::', '')
        : 'unknown'
      const underlying = `\n\nThe underlying error message [${name}] was:\n${options.error instanceof Error ? options.error.message : String(options.error)}`
      this.message = `${this.message}${underlying}`
      this.trace = [...this.trace, name]
    }
    else {
      if (options.inspect) {
        const inspections = isInspectionTuple(options.inspect)
          ? [options.inspect]
          : Array.isArray(options.inspect)
            ? options.inspect
            : [options.inspect]

        inspections.forEach((i, idx) => {
          const intro = isInspectionTuple(i) ? `${i[0]}\n` : `${[idx]}:\n`
          const container = isInspectionTuple(i) ? i[1] : i

          this.message = `${this.message}\n\n${intro}${JSON.stringify(inspect(container), null, 2)}`
        })
      }
      if (this.trace.length > 1)
        this.message = `${this.message}\n\nTrace:${this.trace.map((i, idx) => `${idx}. ${i}`)}`
    }

    this.structuredStack.forEach(
      (l) => {
        this.message = l.getFileName()?.includes('.pnpm')
          ? this.message
          : `${this.message}${showCallsite(l)}`
      },
    )
  }
}
