import { describe, expect, it } from 'vitest'
import type { Course, Curriculum, Semester, TrackDefinition } from '../components/CurriculumGraph'
import { getCurriculumTrackInfo, getTrackColor } from '../components/CurriculumGraph'

function buildCurriculumFixture(overrides?: Partial<Curriculum>): Curriculum {
  const semesters: Semester[] = overrides?.semesters ?? [{ id: 's1', name: 'Semester 1', order: 1 }]

  const course = (c: Partial<Course> & Pick<Course, 'id' | 'semesterId'>): Course => ({
    id: c.id,
    semesterId: c.semesterId,
    name: c.name ?? c.id,
    credits: c.credits ?? 3,
    prerequisiteIds: c.prerequisiteIds ?? [],
    corequisiteIds: c.corequisiteIds ?? [],
    trackId: c.trackId,
  })

  const courses: Course[] = overrides?.courses ?? [
    course({ id: 'C1', semesterId: 's1', trackId: 't1' }),
    course({ id: 'C2', semesterId: 's1', trackId: 't2' }),
    course({ id: 'C3', semesterId: 's1' }),
  ]

  return {
    curriculumId: overrides?.curriculumId ?? 'curr-1',
    name: overrides?.name ?? 'Test Curriculum',
    totalCredits: overrides?.totalCredits ?? 9,
    tracks: overrides?.tracks,
    semesters,
    courses,
  }
}

describe('CurriculumGraph logic', () => {
  it('getCurriculumTrackInfo returns trackOrder containing present tracks in configured order plus unknown tracks', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [
        { id: 't2', name: 'Track Two' },
        { id: 't1', name: 'Track One' },
      ],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't1',
        },
        {
          id: 'C2',
          name: 'Course 2',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't2',
        },
        {
          id: 'C3',
          name: 'Course 3',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't3',
        },
      ],
    })

    const info = getCurriculumTrackInfo(curriculum)
    expect(info.trackOrder).toEqual(['t2', 't1', 't3'])
  })

  it('getCurriculumTrackInfo includes untracked when courses omit trackId', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [{ id: 't1', name: 'Track One' }],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't1',
        },
        {
          id: 'C2',
          name: 'Course 2',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    })

    const info = getCurriculumTrackInfo(curriculum)

    expect(info.trackOrder).toContain('t1')
    expect(info.trackOrder).toContain('untracked')
    expect(info.trackNameById.untracked).toBe('untracked')
    expect(info.trackColorById.untracked).toBe('#ecf0f1')
  })

  it('getCurriculumTrackInfo fills in missing names with id', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [{ id: 't1', name: 'Track One' }],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't1',
        },
        {
          id: 'C2',
          name: 'Course 2',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 'tX',
        },
      ],
    })

    const info = getCurriculumTrackInfo(curriculum)
    expect(info.trackNameById.t1).toBe('Track One')
    expect(info.trackNameById.tX).toBe('tX')
  })

  // ── Case 1: valid input ────────────────────────────────────────────────

  it('getCurriculumTrackInfo assigns a distinct valid hex color to each configured track', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [
        { id: 't1', name: 'T1' },
        { id: 't2', name: 'T2' },
        { id: 't3', name: 'T3' },
      ],
      courses: [
        {
          id: 'C1',
          name: 'C1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't1',
        },
        {
          id: 'C2',
          name: 'C2',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't2',
        },
        {
          id: 'C3',
          name: 'C3',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't3',
        },
      ],
    })
    const info = getCurriculumTrackInfo(curriculum)
    const nonDefaultColors = Object.values(info.trackColorById).filter((c) => c !== '#ecf0f1')
    // Every non-default color must be a valid 6-digit hex
    for (const color of nonDefaultColors) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
    // Colors for distinct tracks should themselves be distinct
    expect(new Set(nonDefaultColors).size).toBe(nonDefaultColors.length)
  })

  // ── Case 2: invalid/error input ────────────────────────────────────────

  it('getCurriculumTrackInfo ignores null and non-object track entries without throwing', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [null, 42, { id: 't1', name: 'Valid' }] as unknown as TrackDefinition[],
      courses: [
        {
          id: 'C1',
          name: 'C1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 't1',
        },
      ],
    })
    expect(() => getCurriculumTrackInfo(curriculum)).not.toThrow()
    const info = getCurriculumTrackInfo(curriculum)
    expect(info.trackOrder).toContain('t1')
    expect(info.trackOrder).not.toContain(null)
    expect(info.trackOrder).not.toContain(42)
  })

  // ── Case 3: edge cases ─────────────────────────────────────────────────

  it('getCurriculumTrackInfo returns configured tracks even when courses array is empty', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [{ id: 't1', name: 'T1' }],
      courses: [],
    })
    const info = getCurriculumTrackInfo(curriculum)
    expect(info.trackOrder).toContain('t1')
    expect(info.trackNameById.t1).toBe('T1')
  })

  it('getCurriculumTrackInfo produces only "untracked" when all courses omit trackId', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [],
      courses: [
        {
          id: 'C1',
          name: 'C1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
        {
          id: 'C2',
          name: 'C2',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    })
    const info = getCurriculumTrackInfo(curriculum)
    expect(info.trackOrder).toEqual(['untracked'])
    expect(info.trackColorById.untracked).toBe('#ecf0f1')
  })

  it('getCurriculumTrackInfo handles legacy record-format track definitions', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [{ 'legacy-track': 'Legacy Track Name' }],
      courses: [
        {
          id: 'C1',
          name: 'C1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 'legacy-track',
        },
      ],
    })
    const info = getCurriculumTrackInfo(curriculum)
    expect(info.trackOrder).toContain('legacy-track')
    expect(info.trackNameById['legacy-track']).toBe('Legacy Track Name')
  })

  it('getCurriculumTrackInfo handles undefined tracks field gracefully', () => {
    const curriculum = buildCurriculumFixture({
      tracks: undefined,
      courses: [
        {
          id: 'C1',
          name: 'C1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 'auto-track',
        },
      ],
    })
    expect(() => getCurriculumTrackInfo(curriculum)).not.toThrow()
    const info = getCurriculumTrackInfo(curriculum)
    expect(info.trackOrder).toContain('auto-track')
  })

  // ── Case 4: performance ────────────────────────────────────────────────

  it('getCurriculumTrackInfo processes 1000 courses across 50 tracks within acceptable time', () => {
    const tracks = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, name: `Track ${i}` }))
    const courses: Course[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `c${i}`,
      name: `Course ${i}`,
      credits: 3,
      prerequisiteIds: [],
      corequisiteIds: [],
      semesterId: 's1',
      trackId: `t${i % 50}`,
    }))
    const curriculum = buildCurriculumFixture({ tracks, courses })
    const start = performance.now()
    const info = getCurriculumTrackInfo(curriculum)
    const elapsed = performance.now() - start
    expect(info.trackOrder).toHaveLength(50)
    expect(elapsed).toBeLessThan(100)
  })

  // ── Case 5: integration ────────────────────────────────────────────────

  it('getTrackColor returns correct colors for all track types returned by getCurriculumTrackInfo', () => {
    const curriculum = buildCurriculumFixture({
      tracks: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      courses: [
        {
          id: 'C1',
          name: 'C1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 'a',
        },
        {
          id: 'C2',
          name: 'C2',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          trackId: 'b',
        },
        {
          id: 'C3',
          name: 'C3',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        }, // untracked
      ],
    })
    const info = getCurriculumTrackInfo(curriculum)
    // Configured tracks get valid hex colors
    for (const trackId of ['a', 'b']) {
      expect(getTrackColor(info, trackId)).toMatch(/^#[0-9a-f]{6}$/i)
    }
    // Untracked courses and unknown trackIds fall back to the default
    expect(getTrackColor(info, 'untracked')).toBe('#ecf0f1')
    expect(getTrackColor(info, undefined)).toBe('#ecf0f1')
    expect(getTrackColor(info, 'does-not-exist')).toBe('#ecf0f1')
  })

  it('getTrackColor returns a track color when present and a default otherwise', () => {
    const curriculum = buildCurriculumFixture()
    const info = getCurriculumTrackInfo(curriculum)

    const known = getTrackColor(info, 't1')
    expect(known).toMatch(/^#[0-9a-f]{6}$/i)

    const unknown = getTrackColor(info, 'does-not-exist')
    expect(unknown).toBe('#ecf0f1')

    const untracked = getTrackColor(info)
    expect(untracked).toBe('#ecf0f1')
  })
})
