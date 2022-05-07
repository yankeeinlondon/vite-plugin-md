import { describe, getClassList, select } from 'happy-wrapper'
import { transformer } from '../utils'

/**
 * Modifies the HTML based on the configuration of `options.
 * escapeCodeTagInterpolation` and the fenced code blocks language
 * (if language starts `!` then options configuration is reversed).
 *
 * Because we are looking at the fenced language, we'll also add that to
 * the payload being passed through as this could be valuable for _search_
 * or other meta features.
 */
export const escapeCodeTagInterpolation = transformer(
  'escapeCodeTagInterpolation',
  'dom', 'dom',
  (payload) => {
    const { options: { escapeCodeTagInterpolation, builders }, html: dom } = payload
    const codeBuilderPresent = !!builders.find(b => b.name === 'code')

    const html = codeBuilderPresent
      // if code() builder is in place you can skip these transforms as this will be handled there
      ? dom
      : select(dom)
        .updateAll('code')((el) => {
          const lang = getClassList(el).find(c => c.startsWith('language-'))
          if (lang) {
            const hasNegation = lang.includes('!')
            const shouldSetVPre = (escapeCodeTagInterpolation && !hasNegation)
            || (!escapeCodeTagInterpolation && hasNegation)

            if (shouldSetVPre) {
              if (el.parentElement)
                el.parentElement.setAttribute('v-pre', 'true')
              else
                throw new Error(`Problem setting the parent element of the "code" tag -- which was intended to be the "pre" tag -- as the code tag does not have a parent: ${describe(el.parentElement)}`)
            }

            const classes = [
              ...getClassList(el).filter(i => i !== lang),
              lang.replace('!', ''),
            ]

            el.setAttribute('class', classes.join(' '))
            payload.fencedLanguages.add(lang.replace('!', ''))
          }
          return el
        })
        .toContainer()

    return { ...payload, html }
  })
