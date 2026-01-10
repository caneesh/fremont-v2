/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Ensure React is available globally for JSX runtime variants in tests.
globalThis.React = React

// Minimal Next.js component mocks for unit tests.
vi.mock('next/image', () => {
  return {
    default: (props: any) => {
      const { priority, fill, ...rest } = props ?? {}
      return React.createElement('img', rest)
    },
  }
})

vi.mock('next/link', () => {
  return {
    default: ({ href, children, ...rest }: any) =>
      React.createElement('a', { href, ...rest }, children),
  }
})
