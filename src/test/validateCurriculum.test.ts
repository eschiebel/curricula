import { describe, expect, it } from 'vitest'
import { validateCurriculumJson } from '../validation/validateCurriculum'
import { getCurriculumTrackInfo } from '../components/CurriculumGraph'

describe('validateCurriculumJson', () => {
  // ── Case 1: valid input ────────────────────────────────────────────────

  it('accepts a curriculum with all optional course fields', () => {
    const value = {
      curriculumId: 'full-curriculum',
      name: 'Full Curriculum',
      totalCredits: 6,
      tracks: [{ id: 'core', name: 'Core' }],
      semesters: [
        { id: 's1', name: 'Semester 1', order: 1, courseIds: ['c1'] },
        { id: 's2', name: 'Semester 2', order: 2, courseIds: ['c2'] },
      ],
      courses: [
        {
          id: 'c1',
          name: 'Intro',
          credits: 3,
          trackId: 'core',
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          userAdded: true,
        },
        {
          id: 'c2',
          name: 'Advanced',
          credits: 3,
          trackId: 'core',
          prerequisiteIds: ['c1'],
          corequisiteIds: [],
          semesterId: 's2',
          new_semester: 's2',
        },
      ],
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.curriculum.courses[0].userAdded).toBe(true)
      expect(result.curriculum.courses[1].new_semester).toBe('s2')
    }
  })

  it('accepts tracks in legacy record-object format', () => {
    const value = {
      curriculumId: 'legacy',
      name: 'Legacy',
      totalCredits: 0,
      tracks: [{ core: 'Core Track' }],
      semesters: [],
      courses: [],
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(true)
  })

  it('accepts a curriculum without the optional tracks field', () => {
    const value = {
      curriculumId: 'no-tracks',
      name: 'No Tracks',
      totalCredits: 0,
      semesters: [],
      courses: [],
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(true)
  })

  // ── Case 2: invalid input ───────────────────────────────────────────────

  it('rejects null input', () => {
    const result = validateCurriculumJson(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeTruthy()
    }
  })

  it('rejects primitive values as input', () => {
    for (const value of [42, 'string', true, []]) {
      const result = validateCurriculumJson(value)
      expect(result.ok, `expected ok=false for ${JSON.stringify(value)}`).toBe(false)
    }
  })

  it('rejects negative totalCredits', () => {
    const value = {
      curriculumId: 'test',
      name: 'Test',
      totalCredits: -1,
      semesters: [],
      courses: [],
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('minimum')
    }
  })

  it('rejects negative course credits', () => {
    const value = {
      curriculumId: 'test',
      name: 'Test',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'S1', order: 1 }],
      courses: [
        {
          id: 'c1',
          name: 'Course 1',
          credits: -3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('minimum')
    }
  })

  it('rejects unknown properties inside a course', () => {
    const value = {
      curriculumId: 'test-curriculum',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'Semester 1', order: 1 }],
      courses: [
        {
          id: 'c1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
          unexpected: 'x',
        },
      ],
    }

    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.split('\n')).toContain(
        '/courses/0: additionalProperties must NOT have additional properties',
      )
    }
  })

  it('rejects a curriculum missing required fields', () => {
    const value = {
      curriculumId: 'test-curriculum',
      name: 'Test Curriculum',
      semesters: [],
      courses: [],
    }

    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.split('\n')).toContain(
        "(root): required must have required property 'totalCredits'",
      )
    }
  })

  it('rejects unknown properties at the root', () => {
    const value = {
      curriculumId: 'test-curriculum',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [],
      courses: [],
      extra: true,
    }

    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.split('\n')).toContain(
        '(root): additionalProperties must NOT have additional properties',
      )
    }
  })

  it('rejects wrong types inside nested objects', () => {
    const value = {
      curriculumId: 'test-curriculum',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'Semester 1', order: 1 }],
      courses: [
        {
          id: 'c1',
          name: 'Course 1',
          credits: '3',
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }

    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.split('\n')).toContain('/courses/0/credits: type must be number')
    }
  })

  // ── Case 3: edge cases ─────────────────────────────────────────────────

  it('accepts empty semesters and courses arrays', () => {
    const value = {
      curriculumId: 'empty',
      name: 'Empty',
      totalCredits: 0,
      semesters: [],
      courses: [],
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(true)
  })

  it('formats error message capped at 10 lines when many fields are invalid', () => {
    const value = {
      curriculumId: 123,
      name: 456,
      totalCredits: 'bad',
      semesters: 'bad',
      courses: 'bad',
      extra1: true,
      extra2: true,
      extra3: true,
      extra4: true,
      extra5: true,
      extra6: true,
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const lines = result.error.split('\n')
      expect(lines.length).toBeLessThanOrEqual(10)
    }
  })

  // ── Case 4: performance ────────────────────────────────────────────────

  it('validates a large curriculum with 200 courses within acceptable time', () => {
    const semesters = Array.from({ length: 20 }, (_, i) => ({
      id: `s${i}`,
      name: `Semester ${i + 1}`,
      order: i + 1,
    }))
    const courses = Array.from({ length: 200 }, (_, i) => ({
      id: `c${i}`,
      name: `Course ${i}`,
      credits: 3,
      prerequisiteIds: i > 0 ? [`c${i - 1}`] : [],
      corequisiteIds: [],
      semesterId: `s${Math.floor(i / 10)}`,
    }))
    const value = {
      curriculumId: 'large',
      name: 'Large Curriculum',
      totalCredits: 600,
      semesters,
      courses,
    }
    const start = performance.now()
    const result = validateCurriculumJson(value)
    const elapsed = performance.now() - start
    expect(result.ok).toBe(true)
    expect(elapsed).toBeLessThan(500)
  })

  // ── Case 5: integration ────────────────────────────────────────────────

  it('validated curriculum can be passed directly to getCurriculumTrackInfo', () => {
    const value = {
      curriculumId: 'integration',
      name: 'Integration Test',
      totalCredits: 6,
      tracks: [
        { id: 'track-a', name: 'Track A' },
        { id: 'track-b', name: 'Track B' },
      ],
      semesters: [{ id: 's1', name: 'S1', order: 1 }],
      courses: [
        {
          id: 'c1',
          name: 'C1',
          credits: 3,
          trackId: 'track-a',
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
        {
          id: 'c2',
          name: 'C2',
          credits: 3,
          trackId: 'track-b',
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }
    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const trackInfo = getCurriculumTrackInfo(result.curriculum)
      expect(trackInfo.trackOrder).toContain('track-a')
      expect(trackInfo.trackOrder).toContain('track-b')
      expect(trackInfo.trackColorById['track-a']).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
