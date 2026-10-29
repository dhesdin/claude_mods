import type { ConfigRow, Register } from 'claude-code'

// Languages every mod of this repo implements. A mod opts in by declaring a `language`
// userConfig field whose options include all of them (see docs/architecture.md, i18n).
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const

export const isModLanguageRow = (row: ConfigRow) => /^[a-z0-9-]+\.language$/i.test(row.key) && LANGS.every(l => row.options?.includes(l))

const pluginOf = (row: ConfigRow) => row.key.slice(0, row.key.indexOf('.'))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'langmod',
        description: 'Set the display language of every mod (en, fr, ja, zh)',
        argumentHint: '[en|fr|ja|zh]',
      })
    } catch {
      // Command refused: nothing else depends on it.
    }
    return next(e)
  })

  on('command.run', { command: 'langmod' }, async ($, e) => {
    const rows = (await $.config.list()).filter(isModLanguageRow)
    const lang = e.args.trim().toLowerCase()
    if (lang === '') {
      if (rows.length === 0) return { text: 'No mod with a language setting is enabled.' }
      const current = rows.map(r => `${pluginOf(r)}: ${String(r.value)}`).join('\n')
      return { text: `${current}\nUsage: /langmod ${LANGS.join('|')}` }
    }
    if (!(LANGS as readonly string[]).includes(lang)) {
      return { text: `Unknown language. Available: ${LANGS.join(', ')}.` }
    }
    const done: string[] = []
    const refused: string[] = []
    for (const row of rows) {
      if (row.isLocked) {
        refused.push(pluginOf(row))
        continue
      }
      const r = await $.config.set({ key: row.key, value: lang })
      ;('deny' in r && r.deny ? refused : done).push(pluginOf(row))
    }
    const lines = [done.length > 0 ? `Language set to ${lang} for: ${done.join(', ')}.` : 'No mod changed.']
    if (refused.length > 0) lines.push(`Not changed (locked or refused): ${refused.join(', ')}.`)
    return { text: lines.join('\n') }
  })
}
