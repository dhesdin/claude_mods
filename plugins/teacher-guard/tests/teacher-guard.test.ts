import { expect, test } from 'claude-code/testing'

import { bashWrites } from '../hooks/bash'
import { resolve, selfAndAncestors } from '../hooks/paths'

const REPO = '/home/u/sip'
const CWD = `${REPO}/src`
const VARS = { HOME: '/home/u', TMPDIR: '/tmp' }

// Paths a Bash command would write, as bashWrites reads it from inside the repo.
const writes = (command: string, cwd = CWD) =>
  bashWrites(command, cwd, VARS).map(f => `${f.reason} ${f.target.kind === 'path' ? f.target.path : `?${f.target.cwd}`}`)

test('paths', () => {
  expect(resolve('/a/b', '../c/./d')).toBe('/a/c/d')
  expect(resolve('/a', '/x//y/')).toBe('/x/y')
  expect(selfAndAncestors('/a/b')).toEqual(['/a/b', '/a', '/'])
})

test('bash: reading, running and testing write nothing', () => {
  for (const c of [
    'ls -la',
    'cat main.py',
    'git status',
    'git diff HEAD~1',
    'git log --oneline',
    'pytest -q tests/',
    'python3 train.py --epochs 3',
    'grep -rn foo . 2>&1 | head',
    'make test >/dev/null 2>&1',
  ]) {
    expect(writes(c).filter(w => !w.endsWith('/dev/null'))).toEqual([])
  }
})

test('bash: writes are found with their target', () => {
  expect(writes('echo x > f')).toEqual([`redirection > ${CWD}/f`])
  expect(writes('echo x >> ../README.md')).toEqual([`redirection >> ${REPO}/README.md`])
  expect(writes('rm -rf build "my file"')).toEqual([`rm ${CWD}/build`, `rm ${CWD}/my file`])
  expect(writes('cp main.py /tmp/claude/x.py')).toEqual(['cp /tmp/claude/x.py'])
  expect(writes('cp /tmp/claude/x.py main.py')).toEqual([`cp ${CWD}/main.py`])
  expect(writes('mv a.py b.py')).toEqual([`mv ${CWD}/a.py`, `mv ${CWD}/b.py`])
  expect(writes("sed -i 's/a/b/' main.py")).toEqual([`sed -i ${CWD}/main.py`])
  expect(writes("sed -i 's/a/b/' /tmp/x")).toEqual(['sed -i /tmp/x'])
  expect(writes('sed -n 1,5p main.py')).toEqual([])
  expect(writes("perl -pi -e 's/a/b/' main.py")).toEqual([`perl -i ${CWD}/main.py`])
  expect(writes('cat main.py | tee out.txt')).toEqual([`tee ${CWD}/out.txt`])
  expect(writes('dd if=/dev/zero of=disk.img bs=1M count=1')).toEqual([`dd ${CWD}/disk.img`])
  expect(writes('sudo touch ~/sip/x')).toEqual([`touch ${REPO}/x`])
  expect(writes('git add -A && git commit -m wip && git push')).toEqual([`git add ${CWD}`, `git commit ${CWD}`, `git push ${CWD}`])
  expect(writes('git -C /home/u/other commit -m x')).toEqual(['git commit /home/u/other'])
  expect(writes('git apply fix.patch; patch -p1 < fix.patch')).toEqual([`git apply ${CWD}`, `patch ${CWD}`])
})

test('bash: cd, variables, substitutions and heredocs', () => {
  expect(writes('cd /tmp/claude && rm -rf scratch')).toEqual(['rm /tmp/claude/scratch'])
  expect(writes('cd .. && rm notes.md')).toEqual([`rm ${REPO}/notes.md`])
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a shell command, ${HOME} is literal here.
  expect(writes('rm "$TMPDIR/x" ${HOME}/sip/y')).toEqual(['rm /tmp/x', `rm ${REPO}/y`])
  // Unknown variable or command substitution: the target cannot be known, judged by the folder.
  expect(writes('rm $UNKNOWN/x')).toEqual([`rm ?${CWD}`])
  expect(writes('rm $(cat list.txt)')).toEqual([`rm ?${CWD}`])
  // A heredoc body is data, not commands.
  expect(writes("cat > /tmp/claude/notes.md <<'EOF'\nrm -rf everything\ngit push\nEOF\nls")).toEqual(['redirection > /tmp/claude/notes.md'])
  expect(writes('2>&1 echo hi >&2')).toEqual([])
})

// A fake machine: the session folder, its git repo, and what reached the engine.
function machine(cwd: string, gitRoot: string | null) {
  const ran: string[] = []
  const status: (string | undefined)[] = []
  const install = (on: (event: string, hook: (...args: never[]) => unknown) => void) => {
    on('session.start', ((_: unknown, e: { cwd: string }) => ({ cwd: e.cwd })) as never)
    on('session.cwd', (() => ({ value: cwd })) as never)
    on('command.register', (() => ({ value: { command: 'teacher-mode' } })) as never)
    on('env.get', ((_: unknown, e: { name: string }) => ({ value: (VARS as Record<string, string>)[e.name] })) as never)
    on('process.run', (() => ({
      value: {
        exitCode: gitRoot ? 0 : 128,
        stdout: gitRoot ? `${gitRoot}\n` : '',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    })) as never)
    on('ui.status', ((_: unknown, e: { text: string | undefined }) => {
      status.push(e.text)
      return { value: undefined }
    }) as never)
    on('tool.call', ((_: unknown, e: { tool: string }) => {
      ran.push(e.tool)
      return { result: 'ok' }
    }) as never)
    on('prompt.compose', (() => ({ sections: [{ id: 'base', text: 'base', scope: 'shared' }] })) as never)
  }
  return { ran, status, install }
}

type Call = { tool: string; [field: string]: unknown }
// Narrowed view of $.tool: the engine's typing of every tool name is too deep for tsc here.
const call = ($: unknown, input: Call) =>
  ($ as { tool: { call: (i: Call) => Promise<{ deny?: string; result?: unknown }> } }).tool.call(input)

const person = { kind: 'composer' as const }
const command = (args: string, origin: { kind: string } = person) => ({
  command: 'teacher-mode',
  args,
  origin: origin as never,
  presentation: { isFullscreen: false, columns: 120 },
})
const compose = {
  model: 'm',
  promptModel: 'm',
  surfaces: [],
  tools: [],
  outputStyle: { name: 'default', isKeepingCodingInstructions: true },
  traits: [],
} as never

test('off by default: nothing is refused, no status, no instruction', async ($, on) => {
  const m = machine(CWD, REPO)
  m.install(on as never)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  expect(m.status).toEqual([undefined])
  expect((await call($, { tool: 'Edit', file_path: `${CWD}/a.py`, old_string: 'a', new_string: 'b' })).result).toBe('ok')
  expect((await call($, { tool: 'Bash', command: 'git commit -am x && rm -rf build' })).result).toBe('ok')
  expect((await $.prompt.compose(compose)).sections.map(s => s.id)).toEqual(['base'])
})

test('activate: the current repo is protected, temp folders stay free', async ($, on) => {
  const m = machine(CWD, REPO)
  m.install(on as never)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  expect((await $.command.run(command('activate'))).text).toBe(
    `Teacher mode on for ${REPO} (this session): Claude can no longer write in it.`,
  )
  expect(m.status).toEqual([undefined, 'TEACHER MODE · sip'])
  expect((await $.command.run(command('activate'))).text).toBe(`Teacher mode is already on for ${REPO}.`)

  const edit = await call($, { tool: 'Edit', file_path: `${CWD}/main.py`, old_string: 'a', new_string: 'b' })
  expect(edit.deny).toContain('Repo in teacher mode: no writes.')
  expect(edit.deny).toContain(`(refused: Edit in ${REPO})`)
  expect((await call($, { tool: 'Write', file_path: `${REPO}/deep/new.py`, content: 'x' })).deny).toContain(REPO)
  expect((await call($, { tool: 'Bash', command: 'echo x > f' })).deny).toContain('redirection >')
  expect((await call($, { tool: 'Bash', command: 'git add -A && git commit -m "done"' })).deny).toContain('git add')
  expect((await call($, { tool: 'Bash', command: 'cd /tmp && cp /tmp/claude/fix.py ~/sip/src/' })).deny).toContain('cp')
  expect((await call($, { tool: 'Bash', command: 'cat main.py' })).result).toBe('ok')
  expect((await call($, { tool: 'Bash', command: 'pytest' })).result).toBe('ok')
  expect((await call($, { tool: 'Bash', command: 'cp main.py /tmp/claude/main.py && rm -rf /tmp/claude/old' })).result).toBe('ok')
  expect((await call($, { tool: 'Write', file_path: '/tmp/claude/notes.md', content: 'x' })).result).toBe('ok')
  expect(m.ran).toEqual(['Bash', 'Bash', 'Bash', 'Write'])

  expect((await $.prompt.compose(compose)).sections.map(s => s.id)).toEqual(['base', 'teacher-guard:instruction'])
})

test('deactivate: only from the prompt, then everything is writable again', async ($, on) => {
  const m = machine(CWD, REPO)
  m.install(on as never)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  await $.command.run(command('activate'))

  expect((await $.command.run(command('deactivate', { kind: 'plugin' }))).text).toBe('Only you can turn teacher mode off, from the prompt.')
  expect((await call($, { tool: 'Edit', file_path: `${CWD}/a.py`, old_string: 'a', new_string: 'b' })).deny).toBeDefined()

  expect((await $.command.run(command('deactivate'))).text).toBe(`Teacher mode off for ${REPO}.`)
  expect(m.status.at(-1)).toBe(undefined)
  expect((await call($, { tool: 'Edit', file_path: `${CWD}/a.py`, old_string: 'a', new_string: 'b' })).result).toBe('ok')
  expect((await $.command.run(command('deactivate'))).text).toBe('Teacher mode is not on for this repo.')
})

test('outside a git repo the folder itself is protected; French replies', { options: { language: 'fr' } }, async ($, on) => {
  const m = machine('/home/u/notes', null)
  m.install(on as never)
  await $.session.start({ cwd: '/home/u/notes', surface: 'terminal', isInteractive: true })

  expect((await $.command.run(command('activate'))).text).toBe(
    'Mode prof activé pour /home/u/notes (cette session) : Claude ne peut plus y écrire.',
  )
  expect(m.status.at(-1)).toBe('MODE PROF · notes')
  expect((await $.command.run(command(''))).text).toBe('Mode prof actif pour : /home/u/notes\nUsage : /teacher-mode activate | deactivate')
})
