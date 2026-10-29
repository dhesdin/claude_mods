// Best-effort reading of a Bash command: which paths it may write to.
// A guard against autopilot, NOT a security barrier: a determined command can always get around it
// (an inline Python script, an alias, a script written elsewhere then run).

import { basename, resolve } from './paths'

// A path the command may write, or `unresolved` when it cannot be known statically
// (command substitution): the caller then judges by the directory the command runs in.
export type Target = { kind: 'path'; path: string } | { kind: 'unresolved'; cwd: string }
export type Finding = { reason: string; target: Target }

type Word = { text: string; isUnresolved: boolean }
type Token = { kind: 'word'; word: Word } | { kind: 'sep' } | { kind: 'redirect'; op: string }

const PREFIXES = new Set(['sudo', 'env', 'nohup', 'time', 'command', 'exec', 'nice', 'ionice', 'xargs', 'doas'])
// Every non-option argument is written (created, changed or removed).
const WRITE_ALL = new Set(['rm', 'rmdir', 'mv', 'touch', 'mkdir', 'truncate', 'ln', 'chmod', 'chown', 'chgrp', 'tee', 'shred', 'unlink'])
// Only the destination (last argument, or -t DIR) is written.
const WRITE_LAST = new Set(['cp', 'rsync', 'install', 'scp'])
const GIT_WRITE = new Set([
  'add',
  'am',
  'apply',
  'checkout',
  'cherry-pick',
  'clean',
  'clone',
  'commit',
  'init',
  'merge',
  'mv',
  'pull',
  'push',
  'rebase',
  'reset',
  'restore',
  'revert',
  'rm',
  'stash',
  'switch',
  'tag',
  'worktree',
])

const isOption = (s: string) => s.startsWith('-') && s !== '-'

// Splits a command into words, separators and redirections, with quotes removed and
// $VAR / ${VAR} / ~ expanded from `vars` (a variable missing from `vars` makes its word unresolved). Heredoc bodies are skipped (they are data, not commands).
export function tokenize(command: string, vars: Record<string, string>): Token[] {
  const tokens: Token[] = []
  const heredocs: string[] = []
  let word: Word | null = null
  let i = 0
  const s = command
  const push = (text: string, isUnresolved = false) => {
    word ??= { text: '', isUnresolved: false }
    word.text += text
    word.isUnresolved ||= isUnresolved
  }
  const end = () => {
    if (word) tokens.push({ kind: 'word', word })
    word = null
  }
  const expand = (): void => {
    // At s[i] === '$'.
    const braced = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}/.exec(s.slice(i))
    const plain = /^\$([A-Za-z_][A-Za-z0-9_]*)/.exec(s.slice(i))
    const m = braced ?? plain
    if (m) {
      // A variable the caller could not look up makes the word unknown.
      const value = vars[m[1] ?? '']
      push(value ?? '', value === undefined)
      i += m[0].length
    } else if (s[i + 1] === '(') {
      // $( ... ): the inner command is read as a command of its own; the word it sits in is unknown.
      push('', true)
      end()
      tokens.push({ kind: 'sep' })
      i += 2
    } else {
      push('$', s[i + 1] === '{')
      i += 1
    }
  }
  while (i < s.length) {
    const c = s[i] ?? ''
    if (c === '\n') {
      end()
      tokens.push({ kind: 'sep' })
      i += 1
      // Skip pending heredoc bodies, line by line, up to each delimiter.
      while (heredocs.length > 0 && i < s.length) {
        const eol = s.indexOf('\n', i)
        const line = s.slice(i, eol < 0 ? s.length : eol)
        i = eol < 0 ? s.length : eol + 1
        if (line.trim() === heredocs[0]) heredocs.shift()
      }
    } else if (c === ' ' || c === '\t') {
      end()
      i += 1
    } else if (c === '\\') {
      push(s[i + 1] === '\n' ? '' : (s[i + 1] ?? ''))
      i += 2
    } else if (c === "'") {
      const close = s.indexOf("'", i + 1)
      push(s.slice(i + 1, close < 0 ? s.length : close))
      i = close < 0 ? s.length : close + 1
    } else if (c === '"') {
      i += 1
      push('')
      while (i < s.length && s[i] !== '"') {
        if (s[i] === '\\' && i + 1 < s.length) {
          push(s[i + 1] ?? '')
          i += 2
        } else if (s[i] === '$') {
          if (s[i + 1] === '(') {
            push('', true)
            i += 2
          } else expand()
        } else if (s[i] === '`') {
          push('', true)
          i += 1
        } else {
          push(s[i] ?? '')
          i += 1
        }
      }
      i += 1
    } else if (c === '`') {
      push('', true)
      end()
      tokens.push({ kind: 'sep' })
      i += 1
    } else if (c === '$') {
      expand()
    } else if (c === '~' && word === null && (s[i + 1] === '/' || s[i + 1] === undefined || /[\s;&|)]/.test(s[i + 1] ?? ''))) {
      push(vars.HOME ?? '~', vars.HOME === undefined)
      i += 1
    } else if (c === ';' || c === '&' || c === '|' || c === '(' || c === ')') {
      if (c === '&' && s[i + 1] === '>') {
        // &> / &>> : both streams to a file.
        end()
        const op = s[i + 2] === '>' ? '&>>' : '&>'
        tokens.push({ kind: 'redirect', op })
        i += op.length
      } else {
        end()
        tokens.push({ kind: 'sep' })
        i += c === s[i + 1] ? 2 : 1
      }
    } else if (c === '>' || c === '<' || (/[0-9]/.test(c) && /^[0-9]+[<>]/.test(s.slice(i)) && word === null)) {
      end()
      const m = /^([0-9]*)(>>|>\||>&|>|<<<|<<-|<<|<&|<>|<)/.exec(s.slice(i))
      const op = m?.[2] ?? c
      i += m?.[0].length ?? 1
      if (op === '<<' || op === '<<-') {
        // Heredoc: read its delimiter now, skip its body after the end of the line.
        while (s[i] === ' ' || s[i] === '\t') i += 1
        const d = /^(['"]?)([^\s'";&|<>]+)\1/.exec(s.slice(i))
        if (d) {
          heredocs.push(d[2] ?? '')
          i += d[0].length
        }
      } else {
        tokens.push({ kind: 'redirect', op })
      }
    } else {
      push(c)
      i += 1
    }
  }
  end()
  return tokens
}

export function bashWrites(command: string, startCwd: string, vars: Record<string, string>): Finding[] {
  const findings: Finding[] = []
  let cwd = startCwd
  const target = (w: Word, at = cwd): Target =>
    w.isUnresolved ? { kind: 'unresolved', cwd: at } : { kind: 'path', path: resolve(at, w.text) }

  // Group tokens into simple commands.
  const commands: { words: Word[]; redirects: { op: string; word: Word }[] }[] = [{ words: [], redirects: [] }]
  const tokens = tokenize(command, vars)
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]
    const current = commands[commands.length - 1]
    if (!t || !current) continue
    if (t.kind === 'sep') commands.push({ words: [], redirects: [] })
    else if (t.kind === 'word') current.words.push(t.word)
    else {
      const next = tokens[k + 1]
      if (next?.kind === 'word') {
        current.redirects.push({ op: t.op, word: next.word })
        k += 1
      }
    }
  }

  for (const { words, redirects } of commands) {
    for (const r of redirects) {
      // `>&2`, `2>&1`: a stream duplicated, not a file. `<` reads.
      if (r.op.startsWith('<') || r.op === '>&') continue
      findings.push({ reason: `redirection ${r.op}`, target: target(r.word) })
    }

    // Leading VAR=value assignments, then wrappers like sudo / env / xargs and their options.
    let args = words
    while (args.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0]?.text ?? '')) args = args.slice(1)
    while (args.length > 0 && PREFIXES.has(basename(args[0]?.text ?? ''))) {
      args = args.slice(1)
      while (args.length > 0 && (isOption(args[0]?.text ?? '') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0]?.text ?? '')))
        args = args.slice(1)
    }
    const [head, ...rest] = args
    if (!head) continue
    const cmd = basename(head.text)
    const operands = (() => {
      const out: Word[] = []
      let isEnd = false
      for (const w of rest) {
        if (!isEnd && w.text === '--') isEnd = true
        else if (isEnd || !isOption(w.text)) out.push(w)
      }
      return out
    })()

    if (cmd === 'cd') {
      const dest = rest[0]
      if (dest && !dest.isUnresolved) cwd = resolve(cwd, dest.text)
      else if (!dest && vars.HOME) cwd = vars.HOME
    } else if (WRITE_ALL.has(cmd)) {
      for (const w of operands) findings.push({ reason: cmd, target: target(w) })
    } else if (WRITE_LAST.has(cmd)) {
      const t = rest.findIndex(w => w.text === '-t' || w.text === '--target-directory')
      const inline = rest.find(w => w.text.startsWith('--target-directory='))
      const dest =
        t >= 0 ? rest[t + 1] : inline ? { ...inline, text: inline.text.slice('--target-directory='.length) } : operands[operands.length - 1]
      if (dest) findings.push({ reason: cmd, target: target(dest) })
    } else if (cmd === 'sed' || cmd === 'perl') {
      const isInPlace = rest.some(w => /^-[a-zA-Z]*i/.test(w.text) || w.text.startsWith('--in-place'))
      if (isInPlace) {
        // The script is the first operand unless given with -e / -f (sed) or -e / -E (perl).
        const hasScriptFlag = rest.some(w => /^-[a-zA-Z]*[eEf]$/.test(w.text) || w.text === '--expression')
        const scripts = new Set(rest.flatMap((w, n) => (/^-[a-zA-Z]*[eEf]$/.test(w.text) && rest[n + 1] ? [rest[n + 1]] : [])))
        const files = operands.filter(w => !scripts.has(w)).slice(hasScriptFlag ? 0 : 1)
        for (const w of files) findings.push({ reason: `${cmd} -i`, target: target(w) })
      }
    } else if (cmd === 'dd') {
      for (const w of rest) if (w.text.startsWith('of=')) findings.push({ reason: 'dd', target: target({ ...w, text: w.text.slice(3) }) })
    } else if (cmd === 'patch') {
      const d = rest.findIndex(w => w.text === '-d' || w.text === '--directory')
      const dir = d >= 0 ? rest[d + 1] : undefined
      findings.push({ reason: 'patch', target: dir ? target(dir) : { kind: 'path', path: cwd } })
    } else if (cmd === 'git') {
      let gitCwd = cwd
      let n = 0
      for (; n < rest.length; n++) {
        const w = rest[n]?.text ?? ''
        if (w === '-C' && rest[n + 1]) {
          const dir = rest[n + 1]
          if (dir) gitCwd = dir.isUnresolved ? gitCwd : resolve(gitCwd, dir.text)
          n += 1
        } else if (w === '-c' || w === '--git-dir' || w === '--work-tree') {
          n += 1
        } else if (w.startsWith('--work-tree=')) {
          gitCwd = resolve(gitCwd, w.slice('--work-tree='.length))
        } else if (!isOption(w)) break
      }
      const sub = rest[n]?.text ?? ''
      if (GIT_WRITE.has(sub)) {
        const clonedInto = sub === 'clone' ? rest.slice(n + 1).filter(w => !isOption(w.text))[1] : undefined
        findings.push({ reason: `git ${sub}`, target: clonedInto ? target(clonedInto, gitCwd) : { kind: 'path', path: gitCwd } })
      }
    }
  }
  return findings
}
