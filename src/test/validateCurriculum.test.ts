import { describe, expect, it } from 'vitest'
import { validateCurriculumJson } from '../validation/validateCurriculum'

describe('validateCurriculumJson', () => {
  it('accepts a valid curriculum object', () => {
    const value = {
      curriculumId: 'test-curriculum',
      name: 'Test Curriculum',
      totalCredits: 0,
      tracks: [{ id: 'general', name: 'General' }],
      semesters: [{ id: 's1', name: 'Semester 1', order: 1, courseIds: ['c1'] }],
      courses: [
        {
          id: 'c1',
          name: 'Course 1',
          credits: 3,
          trackId: 'general',
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }

    const result = validateCurriculumJson(value)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.curriculum.curriculumId).toBe('test-curriculum')
      expect(result.curriculum.courses).toHaveLength(1)
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
})
