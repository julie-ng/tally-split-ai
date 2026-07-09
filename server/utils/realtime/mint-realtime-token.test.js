import { describe, it, expect, beforeAll } from 'vitest'
import { generateKeyPair, exportJWK, jwtVerify, decodeProtectedHeader } from 'jose'
import { mintRealtimeToken } from './mint-realtime-token.js'

let privateJwk
let publicKey

beforeAll(async () => {
  // Ephemeral ES256 keypair as a JWK — mirrors `supabase gen signing-key`
  // output (a JWK with a kid). No real secret needed to test the minter.
  const { privateKey, publicKey: pub } = await generateKeyPair('ES256')
  privateJwk = await exportJWK(privateKey)
  privateJwk.kid = 'test-kid-1'
  publicKey = pub
})

const userId = 'user_abc123'

describe('mintRealtimeToken', () => {
  it('mints a verifiable ES256 token with the required Supabase claims', async () => {
    const { token, expiresAt } = await mintRealtimeToken({ userId, privateJwk })

    const { payload } = await jwtVerify(token, publicKey)
    expect(payload.sub).toBe(userId)
    expect(payload.role).toBe('authenticated')
    expect(payload.iss).toBe('tally-split')
    expect(payload.exp).toBe(expiresAt)
    expect(payload.iat).toBeLessThanOrEqual(expiresAt)
  })

  it('sets alg + kid (from the JWK) on the protected header', async () => {
    const { token } = await mintRealtimeToken({ userId, privateJwk })
    const header = decodeProtectedHeader(token)
    expect(header.alg).toBe('ES256')
    expect(header.kid).toBe('test-kid-1')
    expect(header.typ).toBe('JWT')
  })

  it('accepts the JWK as a JSON string', async () => {
    const { token } = await mintRealtimeToken({ userId, privateJwk: JSON.stringify(privateJwk) })
    const { payload } = await jwtVerify(token, publicKey)
    expect(payload.sub).toBe(userId)
  })

  it('honours a custom ttl', async () => {
    const before = Math.floor(Date.now() / 1000)
    const { expiresAt } = await mintRealtimeToken({ userId, privateJwk, ttlSeconds: 120 })
    expect(expiresAt).toBeGreaterThanOrEqual(before + 120)
    expect(expiresAt).toBeLessThanOrEqual(before + 122)
  })

  it('throws when required params are missing', async () => {
    await expect(mintRealtimeToken({ privateJwk })).rejects.toThrow('userId')
    await expect(mintRealtimeToken({ userId })).rejects.toThrow('privateJwk')
  })

  it('throws when the JWK has no kid', async () => {
    const { kid, ...noKid } = privateJwk
    void kid
    await expect(mintRealtimeToken({ userId, privateJwk: noKid })).rejects.toThrow('kid')
  })
})
