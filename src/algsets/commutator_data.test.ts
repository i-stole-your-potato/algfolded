// @vitest-environment node
import { describe, it, expect } from 'vitest'
// @ts-ignore -- plain JS helper
import { isValidAlg } from '@/helpers/alg_match'
// @ts-ignore -- plain JS helper
import { algToMoveString } from '@/helpers/scramble_utils'
import { puzzles } from 'cubing/puzzles'
import { Alg } from 'cubing/alg'
import { partition, DEFAULT_CORNER_BUFFER_ORDER, type RawComm } from './commutators'
import cornerComms from '@/assets/corner_comms.json'
import edgeComms from '@/assets/edge_comms.json'

type CommData = Record<string, { algs: string[]; buffers: Record<string, string[]> }>

// The comm sets ship their algs in commutator notation (decomposed in place by
// generate_commutators.mjs, like blddb.net). This guards that output against
// the app's own parser: (a) notation coverage stays high, (b) every notation
// alg parses via the app's expander, and (c) — on a sample, since it needs a
// cube engine — all algs of a case still have the identical cube effect, so a
// notation alg can never mean something different from its siblings.
const check = (data: CommData, label: string) => {
  const cases = Object.entries(data).filter(([, v]) => (v.algs?.length ?? 0) > 0)
  const allAlgs = cases.flatMap(([, v]) => v.algs)
  const notated = allAlgs.filter((a) => /[[\],:]/.test(a))

  describe(`${label} commutator data`, () => {
    it('most algs are in commutator notation', () => {
      expect(notated.length / allAlgs.length).toBeGreaterThan(0.9)
    })

    it('every commutator-notation alg parses as a valid alg', () => {
      const invalid = notated.filter((a) => !isValidAlg(a))
      expect(invalid.slice(0, 10)).toEqual([])
    })

    it('every cycle has its inverse in the data (targets swapped)', () => {
      // The "also select inverses" action relies on the reversed cycle being a
      // real case: buffer [t1, t2] must exist as buffer [t2, t1] somewhere.
      const cycles = new Set(
        Object.values(data).flatMap((v) =>
          Object.entries(v.buffers).map(([b, [t1, t2]]) => `${b} ${t1} ${t2}`)),
      )
      const missing = Object.entries(data).flatMap(([id, v]) =>
        Object.entries(v.buffers)
          .filter(([b, [t1, t2]]) => !cycles.has(`${b} ${t2} ${t1}`))
          .map(([b, [t1, t2]]) => `${id}: no inverse for ${b} ${t1} ${t2}`))
      expect(missing.slice(0, 10)).toEqual([])
    })

    it('sampled cases: every alg has the same cube effect as the first', async () => {
      const kpuzzle = await puzzles['3x3x3'].kpuzzle()
      const solved = kpuzzle.defaultPattern()
      const sample = cases.filter((_, i) => i % Math.ceil(cases.length / 60) === 0)
      const bad: string[] = []
      for (const [id, v] of sample) {
        const ref = solved.applyAlg(algToMoveString(v.algs[0]))
        for (const alg of v.algs.slice(1)) {
          if (!solved.applyAlg(algToMoveString(alg)).isIdentical(ref)) {
            bad.push(`${id}: ${alg} != ${v.algs[0]}`)
          }
        }
      }
      expect(bad).toEqual([])
    })
  })
}

check(cornerComms as CommData, 'corner')
check(edgeComms as CommData, 'edge')

describe('D-face corner buffers in the imported data', () => {
  it('keeps every case reachable with the new default order', () => {
    const cases = partition(cornerComms as unknown as Record<string, RawComm>, DEFAULT_CORNER_BUFFER_ORDER)
    expect(cases).toHaveLength(Object.keys(cornerComms).length)
    expect(DEFAULT_CORNER_BUFFER_ORDER.map(b => cases.filter(c => c.path[0] === b).length))
      .toEqual([378, 270, 180, 108, 54, 18])
  })

  it('traces targets from DFR and DFL rather than merely renaming the old buffers', async () => {
    const home = [
      ['UFR', 'FUR', 'RUF'], ['UBR', 'RUB', 'BUR'],
      ['UBL', 'BUL', 'LUB'], ['UFL', 'LUF', 'FUL'],
      ['DFR', 'RDF', 'FDR'], ['DFL', 'FDL', 'LDF'],
      ['DBL', 'LDB', 'BDL'], ['DBR', 'BDR', 'RDB'],
    ]
    const solved = (await puzzles['3x3x3'].kpuzzle()).defaultPattern()
    let checked = 0
    for (const [id, c] of Object.entries(cornerComms) as [string, CommData[string]][]) {
      expect(c.buffers).not.toHaveProperty('RDF')
      expect(c.buffers).not.toHaveProperty('FDL')
      const corners = solved.applyAlg(new Alg(algToMoveString(c.algs[0])).invert()).patternData.CORNERS
      const read = (sticker: string): string => {
        const pos = home.findIndex(stickers => stickers.includes(sticker))
        const slot = home[pos].indexOf(sticker)
        return home[corners.pieces[pos]][(slot + corners.orientation[pos]) % 3]
      }
      for (const buffer of ['DFR', 'DFL']) {
        if (!c.buffers[buffer]) continue
        const first = read(buffer)
        expect(c.buffers[buffer], `${id} from ${buffer}`).toEqual([first, read(first)])
        checked++
      }
    }
    expect(checked).toBe(756)
  })
})
