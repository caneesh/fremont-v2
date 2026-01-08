/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import '@testing-library/jest-dom'

// Ensure React is available globally for JSX runtime variants in tests.
globalThis.React = React
