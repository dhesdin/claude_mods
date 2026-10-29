// Small helpers shared by the samplers. No I/O here.

// "[N/A]", "[Not Supported]", "" or garbage -> null.
export function num(s: string | undefined): number | null {
  const v = Number.parseFloat(s ?? '')
  return Number.isFinite(v) ? v : null
}

// Text coming from other programs (process names, GPU names, mount points) is untrusted:
// drop control and bidi-override characters (terminal escape injection), cap the length.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g

export function clean(s: string, max = 64): string {
  const out = s.replace(UNSAFE, '').trim()
  return out.length > max ? `${out.slice(0, max - 1)}…` : out
}

export function csvRows(text: string): string[][] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(',').map(cell => cell.trim()))
}
