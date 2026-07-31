import { describe, it, expect } from 'vitest'
import { describeChangeSource } from './change-source.utils.js'

// Minimal stand-in for the household store — only the two getters used here.
const householdStore = {
  getMemberName: id => (id === 'usr_1' ? 'Alex Rivera' : 'Unknown'),
  getMemberAvatarUrl: id => (id === 'usr_1' ? 'https://example.test/a.png' : null),
}

describe('describeChangeSource', () => {
  it('resolves a user source to name + avatar', () => {
    expect(describeChangeSource('user:usr_1', householdStore)).toEqual({
      isBot: false,
      label: 'Alex Rivera',
      avatar: 'https://example.test/a.png',
    })
  })

  it('treats a task source as a bot, labelled with the raw source', () => {
    expect(describeChangeSource('task:adjust-expense', householdStore)).toEqual({
      isBot: true,
      label: 'task:adjust-expense',
      avatar: null,
    })
  })

  // A source we can't parse must NOT fall through to the user branch — rendering
  // an unknown writer as a person with a blank avatar would misattribute it.
  it.each([null, undefined, '', 'system', 'users:usr_1'])(
    'falls back to bot for unrecognised source %p',
    (source) => {
      expect(describeChangeSource(source, householdStore).isBot).toBe(true)
    },
  )

  it('does not treat the prefix alone as a member', () => {
    const result = describeChangeSource('user:', householdStore)
    expect(result.isBot).toBe(false)
    expect(result.label).toBe('Unknown')
  })
})
