import { Client } from 'pg'
import type { NextApiRequest, NextApiResponse } from 'next'

import apiWrapper from '@/lib/api/apiWrapper'
import {
  clearLocalConnectionCookie,
  setLocalConnectionCookie,
  type LocalConnection,
} from '@/lib/local-connection'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    clearLocalConnectionCookie(res)
    return res.status(200).json({ ok: true })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const body = (req.body || {}) as Partial<LocalConnection> & { preview?: boolean }
  const preview = Boolean(body.preview)
  const conn: LocalConnection = {
    containerId: body.containerId,
    containerName: (body.containerName || '').trim(),
    host: (body.host || '').trim(),
    port: Number(body.port) || 5432,
    user: (body.user || 'postgres').trim(),
    password: body.password ?? '',
    database: (body.database || 'postgres').trim(),
  }

  if (!conn.host || !conn.containerName) {
    return res.status(400).json({ error: { message: 'host and containerName are required' } })
  }

  const client = new Client({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  })

  try {
    await client.connect()
    const info = await client.query<{
      version: string
      database_size: string
      database_size_bytes: string
      schemas_count: string
      tables_count: string
    }>(`
      select
        version() as version,
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_database_size(current_database())::text as database_size_bytes,
        (select count(*)::text from pg_namespace where nspname not in ('pg_catalog','information_schema') and nspname not like 'pg_toast%' and nspname not like 'pg_temp%') as schemas_count,
        (select count(*)::text from pg_tables where schemaname not in ('pg_catalog','information_schema')) as tables_count
    `)
    await client.end()
    const row = info.rows[0]
    const payload = {
      ok: true,
      version: row?.version ?? null,
      databaseSize: row?.database_size ?? null,
      databaseSizeBytes: row?.database_size_bytes ? Number(row.database_size_bytes) : null,
      schemasCount: row?.schemas_count ? Number(row.schemas_count) : null,
      tablesCount: row?.tables_count ? Number(row.tables_count) : null,
      container: conn.containerName,
    }
    if (!preview) setLocalConnectionCookie(res, conn)
    return res.status(200).json(payload)
  } catch (err: any) {
    try {
      await client.end()
    } catch {}
    const code = err?.code
    const status = code === '28P01' || code === '28000' ? 401 : 400
    return res.status(status).json({
      ok: false,
      code,
      error: { message: err?.message ?? 'Failed to connect' },
    })
  }
}
