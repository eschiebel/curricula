import { describe, expect, it } from 'vitest'
import type { Course, Curriculum, Semester } from '../components/CurriculumGraph'
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
