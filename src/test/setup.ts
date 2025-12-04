import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
// This ensures a clean state between tests
// and prevents memory leaks
afterEach(() => {
  cleanup()
})
