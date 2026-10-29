import { expect, test } from 'claude-code/testing'

import { alerts, fromJsonl, hours, isoWeek, parsePairs, projectName, Tracker, toJsonl, totals } from '../hooks/track'

const MIN = 60000
const T0 = new Date(2026, 9, 29, 10, 0).getTime()

test('segments: extended within the idle threshold, cut after it, round-trip through JSONL', () => {
  const t = new Tracker('s1', 'laptop', 10 * MIN)
  t.touch(T0, 'app')
  t.touch(T0 + 5 * MIN, 'app')
  t.touch(T0 + 30 * MIN, 'app')
  t.touch(T0 + 31 * MIN, 'web')
  expect(t.all().map(s => [s.project, (s.end - s.start) / MIN])).toEqual([
    ['app', 5],
    ['app', 0],
    ['web', 0],
  ])
  const back = fromJsonl(`${toJsonl(t.all())}not json\n`)
  expect(back.length).toBe(3)
  const key = isoWeek(T0).key
  expect(totals(back, [key]).get('app')?.get(key)).toBe(5 * MIN)
  expect(hours(125 * MIN)).toBe('2h05')
})

test('weeks, aliases and priority alerts', () => {
  expect(isoWeek(new Date(2026, 9, 29).getTime()).key).toBe('2026-W44')
  const aliases = parsePairs('~/code/sip/edge=sip/edge; k4u-erp=ERP')
  expect(projectName('/h/code/sip/edge/src', '/h/code/sip', aliases, '/h')).toBe('sip/edge')
  expect(projectName('/h/w/k4u-erp', '/h/w/k4u-erp', aliases, '/h')).toBe('ERP')
  const seg = [{ id: 'a', machine: 'm', project: 'sip/edge', start: T0, end: T0 + MIN }]
  expect(alerts(seg, new Map([['sip/edge', 3]]), T0 + 22 * 24 * 60 * MIN)).toEqual([{ project: 'sip/edge', weeks: 3 }])
  expect(alerts([], new Map([['x', 3]]), T0)).toEqual([{ project: 'x', weeks: null }])
})
