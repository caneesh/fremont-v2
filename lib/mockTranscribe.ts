/**
 * Mock OCR Transcription Helper
 * Simulates the handwriting-to-text conversion process with realistic delays
 */

// Sample physics handwriting transcriptions for demo purposes
const SAMPLE_TRANSCRIPTIONS = [
  `Let me solve this using energy conservation.

Initial energy: $E_i = \\frac{1}{2}mv_0^2 + mgh$

At the bottom of the incline:
$E_f = \\frac{1}{2}mv^2$

By conservation of energy:
$\\frac{1}{2}mv_0^2 + mgh = \\frac{1}{2}mv^2$

Solving for v:
$v = \\sqrt{v_0^2 + 2gh}$`,

  `Using Newton's second law:
$\\sum F = ma$

Forces acting on the block:
- Weight: $W = mg$ (downward)
- Normal force: $N$ (perpendicular to surface)
- Friction: $f = \\mu N$ (opposing motion)

Along the incline:
$mg\\sin\\theta - \\mu mg\\cos\\theta = ma$

Therefore:
$a = g(\\sin\\theta - \\mu\\cos\\theta)$`,

  `For rotational motion:
$\\tau = I\\alpha$

The moment of inertia of a solid sphere:
$I = \\frac{2}{5}MR^2$

Angular acceleration:
$\\alpha = \\frac{\\tau}{I} = \\frac{FR}{\\frac{2}{5}MR^2} = \\frac{5F}{2MR}$

Linear acceleration of center:
$a = \\alpha R = \\frac{5F}{2M}$`,

  `Applying Gauss's law:
$\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{enc}}{\\epsilon_0}$

For a uniformly charged sphere of radius R, at distance r > R:
$E \\cdot 4\\pi r^2 = \\frac{Q}{\\epsilon_0}$

Therefore:
$E = \\frac{Q}{4\\pi\\epsilon_0 r^2} = \\frac{kQ}{r^2}$

This is the same as a point charge at the center.`,

  `For the oscillating system:
$F = -kx$ (restoring force)

Using $F = ma$:
$ma = -kx$
$m\\frac{d^2x}{dt^2} = -kx$
$\\frac{d^2x}{dt^2} = -\\frac{k}{m}x = -\\omega^2 x$

where $\\omega = \\sqrt{\\frac{k}{m}}$

Time period:
$T = \\frac{2\\pi}{\\omega} = 2\\pi\\sqrt{\\frac{m}{k}}$`
]

interface TranscriptionResult {
  text: string
  confidence: number
  processingTimeMs: number
}

/**
 * Simulates OCR transcription of a handwritten physics solution
 * @param file - The uploaded image file (not actually processed in mock)
 * @returns Promise with transcribed text after simulated delay
 */
export async function mockTranscribeImage(file: File): Promise<TranscriptionResult> {
  // Simulate realistic OCR processing time (2-4 seconds)
  const processingTime = 2000 + Math.random() * 2000

  await new Promise(resolve => setTimeout(resolve, processingTime))

  // Select a random sample transcription
  const randomIndex = Math.floor(Math.random() * SAMPLE_TRANSCRIPTIONS.length)
  const transcribedText = SAMPLE_TRANSCRIPTIONS[randomIndex]

  // Simulate varying confidence levels
  const confidence = 0.85 + Math.random() * 0.12 // 85-97%

  return {
    text: transcribedText,
    confidence: parseFloat(confidence.toFixed(2)),
    processingTimeMs: Math.round(processingTime)
  }
}

/**
 * Simulates the "scanning" animation phases
 * Returns progress updates that can be used for UI feedback
 */
export async function* mockScanProgress(): AsyncGenerator<{ phase: string; progress: number }> {
  const phases = [
    { phase: 'Detecting edges...', progress: 20 },
    { phase: 'Enhancing contrast...', progress: 40 },
    { phase: 'Recognizing symbols...', progress: 60 },
    { phase: 'Parsing equations...', progress: 80 },
    { phase: 'Finalizing transcription...', progress: 95 },
  ]

  for (const phase of phases) {
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200))
    yield phase
  }
}

/**
 * Validates that the file is an acceptable image format
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  const maxSizeMB = 10

  if (!acceptedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Please upload a JPG, PNG, or WebP image.`
    }
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.`
    }
  }

  return { valid: true }
}
