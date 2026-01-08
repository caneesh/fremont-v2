/**
 * Sample Debug/Refactor Problems
 *
 * Example problems for testing and demonstration.
 */

import type { DebugProblem, RefactorProblem } from '@/types/debugRefactorMode'

// =============================================================================
// DEBUG PROBLEMS
// =============================================================================

export const SAMPLE_DEBUG_PROBLEMS: readonly DebugProblem[] = [
  {
    id: 'debug-001',
    title: 'Array Sum Bug',
    description: 'Calculate the sum of all numbers in an array. The function has a bug that causes incorrect results.',
    language: 'javascript',
    buggyCode: `function arraySum(numbers) {
  let sum = 0;
  for (let i = 1; i <= numbers.length; i++) {
    sum += numbers[i];
  }
  return sum;
}`,
    testCases: [
      {
        id: 'test-001-1',
        input: '[1, 2, 3, 4, 5]',
        expectedOutput: '15',
        isHidden: false,
      },
      {
        id: 'test-001-2',
        input: '[10, 20, 30]',
        expectedOutput: '60',
        isHidden: false,
      },
      {
        id: 'test-001-3',
        input: '[]',
        expectedOutput: '0',
        isHidden: false,
      },
      {
        id: 'test-001-4',
        input: '[100]',
        expectedOutput: '100',
        isHidden: true,
      },
    ],
    expectedFixTags: ['off-by-one', 'array-indexing'],
    hints: [
      {
        level: 1,
        text: 'Look at the loop boundaries carefully. What values does i take?',
      },
      {
        level: 2,
        text: 'Arrays in JavaScript are 0-indexed. The first element is at index 0.',
      },
      {
        level: 3,
        text: 'The loop should start at 0 and go up to (but not including) numbers.length.',
      },
    ],
    difficulty: 'easy',
  },
  {
    id: 'debug-002',
    title: 'Palindrome Check Bug',
    description: 'Check if a string is a palindrome (reads the same forwards and backwards). The function has a logic error.',
    language: 'javascript',
    buggyCode: `function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const reversed = cleaned.split('').reverse().join('');
  return str === reversed;
}`,
    testCases: [
      {
        id: 'test-002-1',
        input: '"racecar"',
        expectedOutput: 'true',
        isHidden: false,
      },
      {
        id: 'test-002-2',
        input: '"A man a plan a canal Panama"',
        expectedOutput: 'true',
        isHidden: false,
      },
      {
        id: 'test-002-3',
        input: '"hello"',
        expectedOutput: 'false',
        isHidden: false,
      },
      {
        id: 'test-002-4',
        input: '"Was it a car or a cat I saw"',
        expectedOutput: 'true',
        isHidden: true,
      },
    ],
    expectedFixTags: ['comparison-error', 'variable-reference'],
    hints: [
      {
        level: 1,
        text: 'The function creates a cleaned string but then compares something else.',
      },
      {
        level: 2,
        text: 'Look at what variable is being compared to reversed.',
      },
      {
        level: 3,
        text: 'The comparison should use cleaned === reversed instead of str === reversed.',
      },
    ],
    difficulty: 'easy',
  },
  {
    id: 'debug-003',
    title: 'Binary Search Bug',
    description: 'Find the index of a target value in a sorted array using binary search. The function has a subtle bug that causes infinite loops.',
    language: 'javascript',
    buggyCode: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = (left + right) / 2;

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid;
    } else {
      right = mid;
    }
  }

  return -1;
}`,
    testCases: [
      {
        id: 'test-003-1',
        input: '[1, 2, 3, 4, 5], 3',
        expectedOutput: '2',
        isHidden: false,
      },
      {
        id: 'test-003-2',
        input: '[1, 2, 3, 4, 5], 1',
        expectedOutput: '0',
        isHidden: false,
      },
      {
        id: 'test-003-3',
        input: '[1, 2, 3, 4, 5], 6',
        expectedOutput: '-1',
        isHidden: false,
      },
      {
        id: 'test-003-4',
        input: '[2, 4, 6, 8, 10], 8',
        expectedOutput: '3',
        isHidden: true,
      },
    ],
    expectedFixTags: ['infinite-loop', 'integer-division', 'boundary-update'],
    hints: [
      {
        level: 1,
        text: 'What happens when left and right are adjacent and the target is the higher one?',
      },
      {
        level: 2,
        text: 'mid needs to be an integer, not a float. Also, updating left and right should exclude mid.',
      },
      {
        level: 3,
        text: 'Use Math.floor() for mid, and set left = mid + 1 and right = mid - 1.',
      },
    ],
    difficulty: 'medium',
  },
]

// =============================================================================
// REFACTOR PROBLEMS
// =============================================================================

export const SAMPLE_REFACTOR_PROBLEMS: readonly RefactorProblem[] = [
  {
    id: 'refactor-001',
    title: 'Magic Numbers',
    description: 'This function calculates shipping costs but uses magic numbers. Refactor to improve readability.',
    language: 'javascript',
    messyCode: `function calculateShipping(weight, distance) {
  if (weight <= 0 || distance <= 0) {
    return 0;
  }

  let cost = 5.99;

  if (weight > 10) {
    cost += (weight - 10) * 0.5;
  }

  if (distance > 100) {
    cost += (distance - 100) * 0.02;
  }

  if (weight > 50) {
    cost *= 1.25;
  }

  return Math.round(cost * 100) / 100;
}`,
    testCases: [
      {
        id: 'test-r001-1',
        input: '5, 50',
        expectedOutput: '5.99',
        isHidden: false,
      },
      {
        id: 'test-r001-2',
        input: '15, 150',
        expectedOutput: '9.49',
        isHidden: false,
      },
      {
        id: 'test-r001-3',
        input: '60, 200',
        expectedOutput: '38.74',
        isHidden: false,
      },
    ],
    codeSmells: [
      {
        id: 'magic-base-cost',
        name: 'Magic Number: Base Cost',
        description: '5.99 is used without explanation',
        lineRange: { start: 6, end: 6 },
        severity: 'moderate',
      },
      {
        id: 'magic-weight-threshold',
        name: 'Magic Number: Weight Threshold',
        description: '10 and 50 are weight thresholds without named constants',
        lineRange: { start: 8, end: 8 },
        severity: 'moderate',
      },
      {
        id: 'magic-distance-threshold',
        name: 'Magic Number: Distance Threshold',
        description: '100 is used as distance threshold without explanation',
        lineRange: { start: 12, end: 12 },
        severity: 'moderate',
      },
      {
        id: 'magic-multipliers',
        name: 'Magic Number: Multipliers',
        description: '0.5, 0.02, and 1.25 are unclear multipliers',
        lineRange: { start: 9, end: 9 },
        severity: 'minor',
      },
    ],
    styleGoals: [
      {
        id: 'constants',
        description: 'Extract magic numbers to named constants',
        weight: 3,
      },
      {
        id: 'clarity',
        description: 'Add comments explaining business logic',
        weight: 2,
      },
      {
        id: 'structure',
        description: 'Group related calculations',
        weight: 1,
      },
    ],
    difficulty: 'easy',
  },
  {
    id: 'refactor-002',
    title: 'Deep Nesting',
    description: 'This function has deeply nested conditionals. Refactor to improve readability using early returns or guard clauses.',
    language: 'javascript',
    messyCode: `function processOrder(order) {
  let result = { success: false, message: '' };

  if (order) {
    if (order.items && order.items.length > 0) {
      if (order.customer) {
        if (order.customer.email) {
          if (order.paymentMethod) {
            let total = 0;
            for (let i = 0; i < order.items.length; i++) {
              total += order.items[i].price * order.items[i].quantity;
            }

            if (total > 0) {
              result.success = true;
              result.message = 'Order processed';
              result.total = total;
            } else {
              result.message = 'Order total must be positive';
            }
          } else {
            result.message = 'Payment method required';
          }
        } else {
          result.message = 'Customer email required';
        }
      } else {
        result.message = 'Customer info required';
      }
    } else {
      result.message = 'Order must have items';
    }
  } else {
    result.message = 'Order is required';
  }

  return result;
}`,
    testCases: [
      {
        id: 'test-r002-1',
        input: '{ items: [{ price: 10, quantity: 2 }], customer: { email: "test@test.com" }, paymentMethod: "card" }',
        expectedOutput: '{ success: true, message: "Order processed", total: 20 }',
        isHidden: false,
      },
      {
        id: 'test-r002-2',
        input: 'null',
        expectedOutput: '{ success: false, message: "Order is required" }',
        isHidden: false,
      },
      {
        id: 'test-r002-3',
        input: '{ items: [] }',
        expectedOutput: '{ success: false, message: "Order must have items" }',
        isHidden: false,
      },
    ],
    codeSmells: [
      {
        id: 'deep-nesting',
        name: 'Deep Nesting',
        description: 'The code has 6+ levels of nesting making it hard to follow',
        lineRange: { start: 4, end: 4 },
        severity: 'major',
      },
      {
        id: 'arrow-code',
        name: 'Arrow Anti-Pattern',
        description: 'The code forms an arrow shape pointing right',
        lineRange: { start: 1, end: 1 },
        severity: 'major',
      },
      {
        id: 'for-loop',
        name: 'Manual Loop',
        description: 'Could use reduce() for calculating total',
        lineRange: { start: 9, end: 9 },
        severity: 'minor',
      },
    ],
    styleGoals: [
      {
        id: 'early-returns',
        description: 'Use guard clauses / early returns',
        weight: 4,
      },
      {
        id: 'flat-structure',
        description: 'Reduce nesting to 2 levels maximum',
        weight: 3,
      },
      {
        id: 'modern-syntax',
        description: 'Use modern array methods where appropriate',
        weight: 1,
      },
    ],
    difficulty: 'medium',
  },
  {
    id: 'refactor-003',
    title: 'Long Function',
    description: 'This function does too many things. Refactor to follow the Single Responsibility Principle.',
    language: 'javascript',
    messyCode: `function handleUserRegistration(formData) {
  // Validate email
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!formData.email || !emailRegex.test(formData.email)) {
    return { error: 'Invalid email format' };
  }

  // Validate password
  if (!formData.password || formData.password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(formData.password)) {
    return { error: 'Password must contain uppercase letter' };
  }
  if (!/[0-9]/.test(formData.password)) {
    return { error: 'Password must contain a number' };
  }

  // Hash password
  let hash = 0;
  for (let i = 0; i < formData.password.length; i++) {
    hash = ((hash << 5) - hash) + formData.password.charCodeAt(i);
    hash = hash & hash;
  }
  const hashedPassword = Math.abs(hash).toString(16);

  // Create user object
  const user = {
    id: Date.now().toString(),
    email: formData.email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    profile: {
      name: formData.name || 'Anonymous',
      avatar: formData.avatar || 'default.png'
    }
  };

  // Send welcome email (simulated)
  const welcomeEmail = {
    to: user.email,
    subject: 'Welcome!',
    body: 'Thank you for registering, ' + user.profile.name
  };
  console.log('Sending email:', welcomeEmail);

  return { success: true, user };
}`,
    testCases: [
      {
        id: 'test-r003-1',
        input: '{ email: "test@example.com", password: "Password1", name: "John" }',
        expectedOutput: '{ success: true, user: { ... } }',
        isHidden: false,
      },
      {
        id: 'test-r003-2',
        input: '{ email: "invalid", password: "Password1" }',
        expectedOutput: '{ error: "Invalid email format" }',
        isHidden: false,
      },
      {
        id: 'test-r003-3',
        input: '{ email: "test@example.com", password: "short" }',
        expectedOutput: '{ error: "Password must be at least 8 characters" }',
        isHidden: false,
      },
    ],
    codeSmells: [
      {
        id: 'long-function',
        name: 'Long Function',
        description: 'Function does validation, hashing, object creation, and email sending',
        lineRange: { start: 1, end: 1 },
        severity: 'major',
      },
      {
        id: 'mixed-concerns',
        name: 'Mixed Responsibilities',
        description: 'Validation, business logic, and side effects are mixed together',
        lineRange: { start: 1, end: 1 },
        severity: 'major',
      },
      {
        id: 'inline-regex',
        name: 'Inline Regex',
        description: 'Email regex could be extracted to a constant',
        lineRange: { start: 3, end: 3 },
        severity: 'minor',
      },
      {
        id: 'inline-hash',
        name: 'Inline Algorithm',
        description: 'Password hashing logic should be in its own function',
        lineRange: { start: 19, end: 19 },
        severity: 'moderate',
      },
    ],
    styleGoals: [
      {
        id: 'srp',
        description: 'Extract validation, hashing, and email into separate functions',
        weight: 4,
      },
      {
        id: 'testability',
        description: 'Make individual pieces testable',
        weight: 3,
      },
      {
        id: 'reusability',
        description: 'Create reusable utility functions',
        weight: 2,
      },
    ],
    difficulty: 'hard',
  },
]

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Get a debug problem by ID
 */
export function getDebugProblem(id: string): DebugProblem | undefined {
  return SAMPLE_DEBUG_PROBLEMS.find((p) => p.id === id)
}

/**
 * Get a refactor problem by ID
 */
export function getRefactorProblem(id: string): RefactorProblem | undefined {
  return SAMPLE_REFACTOR_PROBLEMS.find((p) => p.id === id)
}

/**
 * Get all problems of a given mode
 */
export function getProblemsByMode(mode: 'debug' | 'refactor') {
  return mode === 'debug' ? SAMPLE_DEBUG_PROBLEMS : SAMPLE_REFACTOR_PROBLEMS
}

/**
 * Get a random problem of a given mode and difficulty
 */
export function getRandomProblem(
  mode: 'debug' | 'refactor',
  difficulty?: 'easy' | 'medium' | 'hard'
) {
  const problems = getProblemsByMode(mode)
  const filtered = difficulty
    ? problems.filter((p) => p.difficulty === difficulty)
    : problems

  if (filtered.length === 0) return undefined

  const index = Math.floor(Math.random() * filtered.length)
  return filtered[index]
}
