import type { ConfigRow, Register } from 'claude-code'

// Languages every mod of this repo implements. A mod opts in by declaring a `language`
// userConfig field whose options include all of them (see docs/architecture.md, i18n).
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const

export const isModLanguageRow = (row: ConfigRow) => /^[a-z0-9-]+\.language$/i.test(row.key) && LANGS.every(l => row.options?.includes(l))

const pluginOf = (row: ConfigRow) => row.key.slice(0, row.key.indexOf('.'))
const isLang = (x: unknown): x is (typeof LANGS)[number] => (LANGS as readonly unknown[]).includes(x)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      // The language chosen with /langmod on this machine also reaches mods installed since then.
      const chosen = await $.store.get('language')
      if (isLang(chosen)) {
        for (const row of (await $.config.list()).filter(isModLanguageRow)) {
          if (!row.isLocked && row.value !== chosen) await $.config.set({ key: row.key, value: chosen })
        }
      }
    } catch {
      // Settings unreadable: each mod keeps its own language.
    }
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
      const chosen = await $.store.get('language').catch(() => undefined)
      const kept = isLang(chosen) ? `\nKept for mods installed later on this machine: ${chosen}` : ''
      return { text: `${current}${kept}\nUsage: /langmod ${LANGS.join('|')}` }
    }
    if (!isLang(lang)) {
      return { text: `Unknown language. Available: ${LANGS.join(', ')}.` }
    }
    await $.store.set('language', lang).catch(() => {})
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
