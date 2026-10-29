import { expect, test } from 'claude-code/testing'

import { frontMatter, summarize, table } from '../hooks/skills'

const presentation = { isFullscreen: false, columns: 120 }
const run = (command: string) => ({ command, args: '', origin: { kind: 'composer' as const }, presentation })
const dir = (name: string) => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })

test('front matter: plain, quoted and block descriptions; one-line summary', () => {
  expect(frontMatter('---\nname: pdf\ndescription: Use this skill for PDFs. Also forms.\n---\n# x')).toEqual({
    name: 'pdf',
    description: 'Use this skill for PDFs. Also forms.',
  })
  expect(frontMatter('---\nname: "a"\ndescription: >\n  Folded text\n  on two lines.\n---')).toEqual({
    name: 'a',
    description: 'Folded text on two lines.',
  })
  expect(frontMatter('no front matter')).toEqual({})
  expect(summarize('Use this skill for PDFs. Also forms.')).toBe('Use this skill for PDFs.')
  expect(summarize('x'.repeat(200)).length).toBe(110)
  expect(summarize('evil\u001b[31m name')).toBe('evil [31m name')
  expect(table([], '(none)')).toBe('  (none)')
  expect(
    table(
      [
        { name: 'b', summary: 'B.' },
        { name: 'a', summary: 'A.' },
      ],
      '-',
    ),
  ).toBe('  a  A.\n  b  B.')
})

test('/help-skills: account, Claude Code and plugins, machine and project', async ($, on) => {
  const files: Record<string, string> = {
    '/h/.claude/skills/synced/acc1/pdf/SKILL.md': '---\nname: pdf\ndescription: Work with PDF files. More.\n---',
    '/h/.claude/skills/passation-projet/SKILL.md': '---\nname: passation-projet\ndescription: Keep the hand-off notes up to date.\n---',
    '/repo/.claude/skills/deploy/SKILL.md': '---\nname: deploy\ndescription: Deploy the app.\n---',
  }
  const dirs: Record<string, string[]> = {
    '/h/.claude/skills': ['passation-projet', 'synced'],
    '/h/.claude/skills/synced': ['acc1'],
    '/h/.claude/skills/synced/acc1': ['pdf'],
    '/repo/.claude/skills': ['deploy'],
  }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('env.get', () => ({ value: '/h' }))
  on('session.root', () => ({ value: '/repo' }))
  on('command.list', () => ({
    value: [
      { name: 'simplify', description: 'Review the changed code for reuse. Then fix.', source: 'builtin' },
      { name: 'anthropic-skills:pdf', description: 'Duplicate of an account skill.', source: 'plugin', plugin: 'anthropic-skills' },
      { name: 'sysmon', description: 'A mod of this repo.', source: 'plugin', plugin: 'sysmon@claude-mods' },
      { name: 'passation-projet', description: 'A machine skill, already listed.', source: 'user' },
    ],
  }))
  on('fs.list', (_, e) => {
    if (e.path?.endsWith('/mod-help/..')) return { value: [dir('mod-help'), dir('sysmon')] }
    const names = dirs[e.path ?? '']
    if (!names) throw new Error('ENOENT')
    return { value: names.map(dir) }
  })
  on('fs.read', (_, e) => {
    const text = files[e.path]
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  expect((await $.command.run(run('help-skills'))).text).toBe(
    [
      'Skills',
      '',
      'Global · claude.ai account (synced to every machine you log in on)',
      '  pdf  Work with PDF files.',
      '',
      'Global · Claude Code and installed plugins (skills and commands; come with Claude Code and the plugins installed)',
      '  simplify  Review the changed code for reuse.',
      '',
      'This machine (~/.claude/skills, not synced: stays on this computer)',
      '  passation-projet  Keep the hand-off notes up to date.',
      '',
      'Project (/repo/.claude/skills)',
      '  deploy  Deploy the app.',
    ].join('\n'),
  )
})

test('/help-mods: description, status, commands and options of each mod', { options: { language: 'fr' } }, async ($, on) => {
  const market = {
    plugins: [
      { name: 'sysmon', source: './plugins/sysmon' },
      { name: 'usage-pace', source: './plugins/usage-pace' },
      { name: 'evil', source: '../../etc' },
    ],
  }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('fs.read', (_, e) => {
    if (e.path.endsWith('/.claude-plugin/marketplace.json')) return { value: JSON.stringify(market) }
    if (e.path.endsWith('/plugins/sysmon/.claude-plugin/plugin.json')) return { value: JSON.stringify({ description: 'GPU panel. More.' }) }
    if (e.path.endsWith('/plugins/usage-pace/.claude-plugin/plugin.json')) return { value: JSON.stringify({ description: 'Usage band' }) }
    throw new Error(`unexpected read ${e.path}`)
  })
  on('config.list', () => ({
    value: [
      {
        key: 'sysmon.language',
        label: 'Language',
        kind: 'choice',
        value: 'fr',
        provider: { plugin: 'sysmon', tier: 'user' },
        isLocked: false,
      },
    ],
  }))
  on('command.list', () => ({ value: [{ name: 'sysmon', description: 'x', source: 'plugin', plugin: 'sysmon@claude-mods' }] }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  expect((await $.command.run(run('help-mods'))).text).toBe(
    [
      'Mods (claude-mods)',
      '',
      'sysmon  (activé)',
      '  GPU panel.',
      '  commandes: /sysmon',
      '  options: language=fr',
      '',
      'usage-pace  (non activé)',
      '  Usage band',
    ].join('\n'),
  )
})
