import Ajv from 'ajv/dist/2020'
import type { ErrorObject, ValidateFunction } from 'ajv'
import type { Curriculum } from '../components/CurriculumGraph'
import schema from '../schemas/curriculum.schema.json'

type Schema = typeof schema

const ajv = new Ajv({
  allErrors: true,
  strict: true,
})

const validate: ValidateFunction<Curriculum> = ajv.compile(schema as Schema)

function formatAjvErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors || errors.length === 0) return 'Unknown schema validation error'
  return errors
    .slice(0, 10)
    .map((e) => {
      const instancePath = e.instancePath && e.instancePath.length > 0 ? e.instancePath : '(root)'
      const keyword = e.keyword
      const message = e.message ?? 'invalid'
      return `${instancePath}: ${keyword} ${message}`
    })
    .join('\n')
}

export function validateCurriculumJson(
  value: unknown,
): { ok: true; curriculum: Curriculum } | { ok: false; error: string } {
  const ok = validate(value)
  if (!ok) {
    return { ok: false, error: formatAjvErrors(validate.errors) }
  }
  return { ok: true, curriculum: value as Curriculum }
}
