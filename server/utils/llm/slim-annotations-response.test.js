import { describe, it, expect } from 'vitest'
import { slimAnnotationsResponse } from './slim-annotations-response.js'

const rawResponse = {
  raw: {
    id: 'chatcmpl-abc123',
    object: 'chat.completion',
    created: 1234567890,
    model: 'gpt-4o-2024-08-06',
    system_fingerprint: 'fp_xyz',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: '{"annotations":[],"notes":null}' },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 1200,
      completion_tokens: 80,
      total_tokens: 1280,
      extra_detail: 'should be dropped',
    },
  },
  annotations: {
    annotations: [
      { lineItem: 'Coffee', initials: 'MM', type: 'circle' },
      { lineItem: 'Cake', initials: 'JS', type: 'strikethrough' },
    ],
    notes: 'Two items annotated',
  },
}

describe('slimAnnotationsResponse', () => {
  it('should keep model from raw envelope', () => {
    const result = slimAnnotationsResponse(rawResponse)
    expect(result.model).toBe('gpt-4o-2024-08-06')
  })

  it('should keep only the three usage token fields', () => {
    const result = slimAnnotationsResponse(rawResponse)
    expect(result.usage).toEqual({
      prompt_tokens: 1200,
      completion_tokens: 80,
      total_tokens: 1280,
    })
    expect(result.usage.extra_detail).toBeUndefined()
  })

  it('should flatten annotations array', () => {
    const result = slimAnnotationsResponse(rawResponse)
    expect(result.annotations).toEqual(rawResponse.annotations.annotations)
    expect(result.annotations).toHaveLength(2)
  })

  it('should keep notes', () => {
    const result = slimAnnotationsResponse(rawResponse)
    expect(result.notes).toBe('Two items annotated')
  })

  it('should drop the raw envelope (choices, id, system_fingerprint)', () => {
    const result = slimAnnotationsResponse(rawResponse)
    expect(result.raw).toBeUndefined()
    expect(result.choices).toBeUndefined()
    expect(result.id).toBeUndefined()
    expect(result.system_fingerprint).toBeUndefined()
  })

  it('should default to empty annotations + null fields when inner data missing', () => {
    const result = slimAnnotationsResponse({ raw: {}, annotations: null })
    expect(result.model).toBeNull()
    expect(result.usage).toBeNull()
    expect(result.annotations).toEqual([])
    expect(result.notes).toBeNull()
  })

  it('should be idempotent on an already-slimmed object', () => {
    const slimmed = slimAnnotationsResponse(rawResponse)
    const reSlimmed = slimAnnotationsResponse(slimmed)
    expect(reSlimmed).toEqual(slimmed)
  })

  it('should preserve usage and model when re-slimming an already-slim object', () => {
    const alreadySlim = {
      model: 'gpt-4o-2024-08-06',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      annotations: [{ lineItem: 'X' }],
      notes: 'note',
    }
    expect(slimAnnotationsResponse(alreadySlim)).toEqual(alreadySlim)
  })

  it('should return null/undefined input as-is', () => {
    expect(slimAnnotationsResponse(null)).toBeNull()
    expect(slimAnnotationsResponse(undefined)).toBeUndefined()
  })

  it('should produce smaller output than the raw input', () => {
    const beforeSize = JSON.stringify(rawResponse).length
    const afterSize = JSON.stringify(slimAnnotationsResponse(rawResponse)).length
    expect(afterSize).toBeLessThan(beforeSize)
  })
})
