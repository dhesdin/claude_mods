// Reading SKILL.md front matter, and laying out the lists. No I/O here.

export type Skill = { name: string; summary: string }

const unquote = (s: string) => s.trim().replace(/^(['"])(.*)\1$/, '$2')

// `name` and `description` of a SKILL.md front matter (single-line, quoted, or a `>` / `|` block).
export function frontMatter(text: string): { name?: string; description?: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!m) return {}
  const lines = (m[1] ?? '').split(/\r?\n/)
  const out: Record<string, string> = {}
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(lines[i] ?? '')
    if (!kv) continue
    const [, key = '', value = ''] = kv
    if (/^[>|][-+]?$/.test(value.trim())) {
      const block: string[] = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1] ?? '')) block.push((lines[++i] ?? '').trim())
      out[key] = block.join(' ')
    } else {
      out[key] = unquote(value)
    }
  }
  return { name: out.name, description: out.description }
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: removing control characters is the point.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g

// One line: the first sentence, cut to `max` characters, control characters removed.
export function summarize(description: string | undefined, max = 110): string {
  const text = (description ?? '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim()
  const first = /^(.+?[.!?。])(\s|$)/.exec(text)?.[1] ?? text
  return first.length > max ? `${first.slice(0, max - 1)}…` : first
}

export function table(rows: Skill[], none: string): string {
  if (rows.length === 0) return `  ${none}`
  const width = Math.min(32, Math.max(...rows.map(r => r.name.length)))
  return [...rows]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(r => `  ${r.name.padEnd(width)}  ${r.summary}`)
    .join('\n')
}
