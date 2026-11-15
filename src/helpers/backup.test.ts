import {describe, it, expect, vi} from 'vitest'
import {captureBackup, parseBackup, restoreBackup, RECOVERY_KEY} from './backup'

describe('portable backups', () => {
  it('round trips every data category across multiple sets, excluding credentials and unrelated data', () => {
    const entries = {
      ltctTrainerSettings: JSON.stringify({timerFont: 'Arial', bufferOrder: ['DFR', 'DFL']}),
      ltctLetterScheme: JSON.stringify({UFR: '我'}), ltctEdgeLetterScheme: JSON.stringify({UF: 'A'}),
      ltct_locale: 'fr', 'ltct_theme.is_dark': 'true', ltct_active_algset: 'commCorner',
      'ltctTrainerNotes:commCorner': JSON.stringify({a: '備註 🥔'}),
      'algfoldedCustomAlgs:commEdge': JSON.stringify({b: ["R U R'"]}),
      'algfoldedPreferredAlgs:commEdge': JSON.stringify({b: "R U R'"}),
      'currentLtctArray:ltct': JSON.stringify(['a']),
      'ltct_presets_arrays:t2c': JSON.stringify({star: ['b']}),
      'ltct_srs:ltct': JSON.stringify({a: {ema: 123, last: 1}}), 'ltct_srs_counter:ltct': '1',
      'ltct_store:ltct': JSON.stringify({keys: ['a'], keysCount: {a: 1}, mode: 'recap', stats: [{key: 'a', ms: 123}], upcoming: []}),
      'algfolded_flow_runs:parities': JSON.stringify([{ms: 567}]),
      'algfolded_flow_trouble:parities': JSON.stringify({a: {strikes: 2}}),
    }
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v)
    localStorage.setItem('access_token', 'secret')
    localStorage.setItem('algfolded_solve_queue', '[]')
    localStorage.setItem(RECOVERY_KEY, 'old recovery')
    const snapshot = parseBackup(JSON.stringify(captureBackup()))
    expect(snapshot.data).toEqual(entries)
    localStorage.clear()
    localStorage.setItem('other_app', 'keep')
    localStorage.setItem('ltctTrainerNotes:flips2', '{"obsolete":"remove"}')
    restoreBackup(snapshot)
    expect(captureBackup().data).toEqual(entries)
    expect(localStorage.getItem('ltctTrainerNotes:flips2')).toBeNull()
    expect(localStorage.getItem('other_app')).toBe('keep')
    const recovery = parseBackup(localStorage.getItem(RECOVERY_KEY)!)
    expect(recovery.data).toEqual({'ltctTrainerNotes:flips2': '{"obsolete":"remove"}'})
    restoreBackup(recovery)
    expect(captureBackup().data).toEqual(recovery.data)
  })

  it.each([
    {version: 2}, {app: 'other'}, {createdAt: 'bad'}, {data: {'access_token': 'secret'}},
    {data: {'ltct_store:ltct': 'null'}}, {data: {'algfoldedCustomAlgs:ltct': '{"a":null}'}},
    {data: {ltctTrainerSettings: '{"bufferOrder":12}'}},
    {data: {'ltctTrainerNotes:ltct': '{"__proto__":{"bad":true}}'}},
    {data: {'ltct_srs_counter:ltct': '-1'}},
  ])('rejects incompatible or corrupt data before touching storage: %j', patch => {
    localStorage.setItem('ltct_locale', 'en')
    const before = captureBackup()
    expect(() => restoreBackup({...before, ...patch} as any)).toThrow('invalid_backup')
    expect(captureBackup().data).toEqual(before.data)
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull()
  })

  it('preserves old combined namespaces for migration on reload', () => {
    localStorage.setItem('ltctTrainerNotes', JSON.stringify({ltct: {a: 'hello'}, commEdge: {b: 'bye'}}))
    expect(parseBackup(JSON.stringify(captureBackup())).data).toEqual(captureBackup().data)
  })

  it('does not mutate user data when there is no room for recovery', () => {
    localStorage.setItem('ltct_locale', 'en')
    const before = captureBackup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => restoreBackup({...before, data: {ltct_locale: 'de'}})).toThrow('recovery_space')
    expect(captureBackup().data).toEqual(before.data)
  })

  it('rolls back a partially written restore and keeps the recovery copy', () => {
    localStorage.setItem('ltct_locale', 'en')
    const before = captureBackup()
    const set = Storage.prototype.setItem
    let failed = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'ltct_active_algset' && !failed) { failed = true; throw new Error('quota') }
      return set.call(this, key, value)
    })
    expect(() => restoreBackup({...before, data: {ltct_locale: 'de', ltct_active_algset: 'ltct'}})).toThrow('restore_failed')
    expect(captureBackup().data).toEqual(before.data)
    expect(parseBackup(localStorage.getItem(RECOVERY_KEY)!).data).toEqual(before.data)
  })
})
