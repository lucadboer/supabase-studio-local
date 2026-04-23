import crypto from 'crypto-js'
import type { NextApiRequest, NextApiResponse } from 'next'

import { ENCRYPTION_KEY } from '@/lib/api/self-hosted/constants'
import { LOCAL_CONNECTION_COOKIE } from '@/lib/local-connection-constants'

export { LOCAL_CONNECTION_COOKIE }
const COOKIE_SECRET = process.env.STUDIO_LOCAL_COOKIE_SECRET || ENCRYPTION_KEY

export type LocalConnection = {
  containerId?: string
  containerName: string
  host: string
  port: number
  user: string
  password: string
  database: string
}

export function buildConnectionString(conn: LocalConnection): string {
  const user = encodeURIComponent(conn.user)
  const password = encodeURIComponent(conn.password)
  const db = encodeURIComponent(conn.database)
  return `postgresql://${user}:${password}@${conn.host}:${conn.port}/${db}`
}

export function encryptConnectionString(connectionString: string): string {
  return crypto.AES.encrypt(connectionString, ENCRYPTION_KEY).toString()
}

function signValue(value: string): string {
  const hmac = crypto.HmacSHA256(value, COOKIE_SECRET).toString()
  return `${value}.${hmac}`
}

function verifySigned(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.')
  if (lastDot < 0) return null
  const value = signed.slice(0, lastDot)
  const sig = signed.slice(lastDot + 1)
  const expected = crypto.HmacSHA256(value, COOKIE_SECRET).toString()
  if (expected !== sig) return null
  return value
}

function encodeCookieValue(conn: LocalConnection): string {
  const payload = Buffer.from(JSON.stringify(conn), 'utf8').toString('base64url')
  return signValue(payload)
}

function decodeCookieValue(raw: string): LocalConnection | null {
  const value = verifySigned(raw)
  if (!value) return null
  try {
    const json = Buffer.from(value, 'base64url').toString('utf8')
    return JSON.parse(json) as LocalConnection
  } catch {
    return null
  }
}

export function setLocalConnectionCookie(res: NextApiResponse, conn: LocalConnection) {
  const value = encodeCookieValue(conn)
  const maxAge = 60 * 60 * 24 * 7
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : ''
  res.setHeader(
    'Set-Cookie',
    `${LOCAL_CONNECTION_COOKIE}=${value}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax;${secure}`
  )
}

export function clearLocalConnectionCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    `${LOCAL_CONNECTION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  )
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return header
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const eq = pair.indexOf('=')
      if (eq < 0) return acc
      const k = pair.slice(0, eq).trim()
      const v = decodeURIComponent(pair.slice(eq + 1).trim())
      acc[k] = v
      return acc
    }, {})
}

export function getLocalConnection(req: NextApiRequest | { headers: { cookie?: string } }): LocalConnection | null {
  const raw =
    (req as NextApiRequest).cookies?.[LOCAL_CONNECTION_COOKIE] ??
    parseCookieHeader(req.headers?.cookie)[LOCAL_CONNECTION_COOKIE]
  if (!raw) return null
  return decodeCookieValue(raw)
}

export function getEncryptedConnectionHeader(
  req: NextApiRequest | { headers: { cookie?: string } }
): string | null {
  const conn = getLocalConnection(req)
  if (!conn) return null
  return encryptConnectionString(buildConnectionString(conn))
}
