import type { Register } from 'claude-code'

import { strings } from './i18n'
import type { Skill } from './skills'
import { frontMatter, summarize, table } from './skills'

type Marketplace = { plugins?: { name?: unknown; source?: unknown; description?: unknown }[] }

export const register: Register = (on, options) => {
  const t = strings(options.language)

  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: 'help-skills', description: t.helpSkills })
      await $.command.register({ name: 'help-mods', description: t.helpMods })
    } catch {
      // Commands refused: nothing else depends on them.
    }
    return next(e)
  })

  on('command.run', { command: 'help-skills' }, async $ => {
    // Skill folders (a linked skill folder lists as `other`).
    const folders = async (path: string) => (await $.fs.list(path).catch(() => [])).filter(d => d.kind !== 'file').map(d => d.name)
    const skillsIn = async (root: string): Promise<Skill[]> => {
      const found = await Promise.all(
        (await folders(root)).map(async dir => {
          const text = await $.fs.read(`${root}/${dir}/SKILL.md`).catch(() => null)
          if (text === null) return null
          const fm = frontMatter(text)
          return { name: fm.name || dir, summary: summarize(fm.description) }
        }),
      )
      return found.filter((s): s is Skill => s !== null)
    }

    const home = await $.env.get('HOME')
    const base = `${home}/.claude/skills`
    // claude.ai account skills are synced under ~/.claude/skills/synced/<account id>/.
    const account = home ? (await Promise.all((await folders(`${base}/synced`)).map(id => skillsIn(`${base}/synced/${id}`)))).flat() : []
    const machine = home ? await skillsIn(base) : []
    const root = await $.session.root()
    const project = await skillsIn(`${root}/.claude/skills`)
    const unique = (list: Skill[]) => list.filter((s, i) => list.findIndex(o => o.name === s.name) === i)

    // Built into Claude Code, or from installed plugins. The engine does not tell a skill from a command,
    // so both are listed; skills already found in a folder above, and this repo's mods (see /help-mods), are left out.
    const known = new Set([...account, ...machine, ...project].map(s => s.name))
    const siblings = new Set(await folders(`${$.plugin.root}/..`))
    const builtIn = (await $.command.list())
      .filter(c => c.source === 'builtin' || c.source === 'plugin')
      .filter(c => !known.has(c.name) && !known.has(c.name.slice(c.name.indexOf(':') + 1)))
      .filter(c => !siblings.has(c.plugin?.split('@')[0] ?? '') && !c.plugin?.endsWith('@claude-mods'))
      .map(c => ({ name: c.name, summary: summarize(c.description) }))

    return {
      text: [
        t.skillsTitle,
        '',
        t.globalAccount,
        table(unique(account), t.none),
        '',
        t.builtIn,
        table(unique(builtIn), t.none),
        '',
        t.globalMachine,
        table(machine, t.none),
        '',
        t.project(root),
        table(project, t.none),
      ].join('\n'),
    }
  })

  on('command.run', { command: 'help-mods' }, async $ => {
    // This mod sits in plugins/<name>/ of the claude-mods repository, next to the marketplace file.
    const repo = `${$.plugin.root}/../..`
    const json = async (path: string) =>
      $.fs
        .read(path)
        .then(text => JSON.parse(text) as unknown)
        .catch(() => null)
    const market = (await json(`${repo}/.claude-plugin/marketplace.json`)) as Marketplace | null
    if (!market?.plugins) return { text: t.noMarketplace }
    const [rows, commands] = await Promise.all([$.config.list(), $.command.list()])

    const lines = [t.modsTitle, '']
    for (const entry of market.plugins) {
      const name = String(entry.name ?? '')
      const source = String(entry.source ?? '')
      // Only this repository's own plugin folders are read.
      if (!/^[a-z0-9-]+$/.test(name) || !/^\.\/plugins\/[a-z0-9-]+$/.test(source)) continue
      const manifest = (await json(`${repo}/${source.slice(2)}/.claude-plugin/plugin.json`)) as { description?: unknown } | null
      const isOwn = (plugin?: string) => plugin?.split('@')[0] === name
      const own = commands.filter(c => c.source === 'plugin' && isOwn(c.plugin)).map(c => `/${c.name}`)
      const opts = rows.filter(r => r.key.startsWith(`${name}.`)).map(r => `${r.key.slice(name.length + 1)}=${String(r.value)}`)
      lines.push(`${name}  (${own.length > 0 || opts.length > 0 ? t.enabled : t.notEnabled})`)
      lines.push(`  ${summarize(String(manifest?.description ?? entry.description ?? ''), 160)}`)
      if (own.length > 0) lines.push(`  ${t.commands}: ${own.join(', ')}`)
      if (opts.length > 0) lines.push(`  ${t.options}: ${opts.join(', ')}`)
      lines.push('')
    }
    return { text: lines.join('\n').trimEnd() }
  })
}
