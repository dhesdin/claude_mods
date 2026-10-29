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

// A fake machine: files that exist, the session folder, and what reached the engine.
function machine(files: string[], cwd: string, isMarkerTracked = false) {
  const ran: string[] = []
  const status: (string | undefined)[] = []
  const install = (on: (event: string, hook: (...args: never[]) => unknown) => void) => {
    on('session.start', ((_: unknown, e: { cwd: string }) => ({ cwd: e.cwd })) as never)
    on('session.cwd', (() => ({ value: cwd })) as never)
    on('env.get', ((_: unknown, e: { name: string }) => ({ value: (VARS as Record<string, string>)[e.name] })) as never)
    on('fs.read', ((_: unknown, e: { path: string }) => {
      if (!files.includes(e.path)) throw new Error('ENOENT')
      return { value: '' }
    }) as never)
    on('process.run', ((_: unknown, e: { argv: string[] }) => {
      // git ls-files: tracked 0 / not tracked 1; git check-ignore: ignored 0.
      const exitCode = e.argv.includes('ls-files') && !isMarkerTracked ? 1 : 0
      return { value: { exitCode, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    }) as never)
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

test('protected repo: Edit and writes refused, reading and tests allowed, status and instruction shown', async ($, on) => {
  const m = machine([`${REPO}/.teacher-mode`], CWD)
  m.install(on as never)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  expect(m.status).toEqual(['TEACHER MODE'])
  const edit = await call($, { tool: 'Edit', file_path: `${CWD}/main.py`, old_string: 'a', new_string: 'b' })
  expect(edit.deny).toContain('Repo in teacher mode: no writes.')
  expect(edit.deny).toContain(`(refused: Edit in ${REPO})`)
  expect((await call($, { tool: 'Bash', command: 'echo x > f' })).deny).toContain('redirection >')
  expect((await call($, { tool: 'Bash', command: 'rm ../.teacher-mode' })).deny).toContain('rm')
  expect((await call($, { tool: 'Bash', command: 'git commit -m "done"' })).deny).toContain('git commit')
  expect((await call($, { tool: 'Bash', command: 'cat main.py' })).result).toBe('ok')
  expect((await call($, { tool: 'Bash', command: 'pytest' })).result).toBe('ok')
  // Free to work in temporary folders.
  expect((await call($, { tool: 'Bash', command: 'cp main.py /tmp/claude/main.py && rm -rf /tmp/claude/old' })).result).toBe('ok')
  expect((await call($, { tool: 'Write', file_path: '/tmp/claude/notes.md', content: 'x' })).result).toBe('ok')
  expect(m.ran).toEqual(['Bash', 'Bash', 'Bash', 'Write'])

  const composed = await $.prompt.compose({
    model: 'm',
    promptModel: 'm',
    surfaces: [],
    tools: [],
    outputStyle: { name: 'default', isKeepingCodingInstructions: true },
    traits: [],
  } as never)
  expect(composed.sections.map(s => s.id)).toEqual(['base', 'teacher-guard:instruction'])
})

test('unprotected repo: nothing changes', async ($, on) => {
  const m = machine([], '/home/u/other')
  m.install(on as never)
  await $.session.start({ cwd: '/home/u/other', surface: 'terminal', isInteractive: true })

  expect(m.status).toEqual([undefined])
  expect((await call($, { tool: 'Edit', file_path: '/home/u/other/a.py', old_string: 'a', new_string: 'b' })).result).toBe('ok')
  expect((await call($, { tool: 'Bash', command: 'git commit -am x && rm -rf build' })).result).toBe('ok')
  expect(m.ran).toEqual(['Edit', 'Bash'])
})

test('a write aimed at a protected repo from another folder is refused', async ($, on) => {
  const m = machine([`${REPO}/.teacher-mode`], '/home/u/other')
  m.install(on as never)
  await $.session.start({ cwd: '/home/u/other', surface: 'terminal', isInteractive: true })

  expect((await call($, { tool: 'Write', file_path: `${REPO}/src/deep/new.py`, content: 'x' })).deny).toContain(REPO)
  expect((await call($, { tool: 'Bash', command: 'cp fix.py ~/sip/src/' })).deny).toContain('cp')
  expect(m.ran).toEqual([])
})

test('French status line; a marker tracked by git is flagged', { options: { language: 'fr' } }, async ($, on) => {
  const m = machine([`${REPO}/.teacher-mode`], CWD, true)
  m.install(on as never)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  expect(m.status).toEqual(['MODE PROF · .teacher-mode est suivi par git : git rm --cached .teacher-mode'])
})
