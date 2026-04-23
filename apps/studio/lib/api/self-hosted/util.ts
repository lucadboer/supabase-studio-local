import crypto from 'crypto-js'

import {
  ENCRYPTION_KEY,
  POSTGRES_DATABASE,
  POSTGRES_HOST,
  POSTGRES_PASSWORD,
  POSTGRES_PORT,
  POSTGRES_USER_READ_ONLY,
  POSTGRES_USER_READ_WRITE,
} from './constants'
import { IS_PLATFORM } from '@/lib/constants'
import { buildConnectionString, getLocalConnection } from '@/lib/local-connection'

/**
 * Asserts that the current environment is self-hosted.
 */
export function assertSelfHosted() {
  if (IS_PLATFORM) {
    throw new Error('This function can only be called in self-hosted environments')
  }
}

export function encryptString(stringToEncrypt: string): string {
  return crypto.AES.encrypt(stringToEncrypt, ENCRYPTION_KEY).toString()
}

export function getConnectionString({
  readOnly,
  headers,
}: {
  readOnly: boolean
  headers?: HeadersInit | Headers | Record<string, any>
}) {
  const cookie = extractCookieHeader(headers)
  if (cookie) {
    const local = getLocalConnection({ headers: { cookie } })
    if (local) return buildConnectionString(local)
  }
  const postgresUser = readOnly ? POSTGRES_USER_READ_ONLY : POSTGRES_USER_READ_WRITE
  return `postgresql://${postgresUser}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}`
}

function extractCookieHeader(headers?: HeadersInit | Headers | Record<string, any>): string | undefined {
  if (!headers) return undefined
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get('cookie') ?? undefined
  }
  if (Array.isArray(headers)) {
    const pair = headers.find(([k]) => k?.toLowerCase() === 'cookie')
    return pair?.[1]
  }
  const obj = headers as Record<string, any>
  return obj.cookie ?? obj.Cookie
}
