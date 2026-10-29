// POSIX path helpers (the module has no Node `path`).

export function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return `/${out.join('/')}`
}

export function resolve(cwd: string, path: string): string {
  return normalize(path.startsWith('/') ? path : `${cwd}/${path}`)
}

// The path itself, then each parent up to `/`.
export function selfAndAncestors(path: string): string[] {
  const dirs = [normalize(path)]
  while (dirs[dirs.length - 1] !== '/') {
    const last = dirs[dirs.length - 1] ?? '/'
    dirs.push(last.slice(0, last.lastIndexOf('/')) || '/')
  }
  return dirs
}

export const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1)
