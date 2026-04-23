import type { NextApiRequest, NextApiResponse } from 'next'

import apiWrapper from '@/lib/api/apiWrapper'
import { getLocalConnection } from '@/lib/local-connection'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const conn = getLocalConnection(req)
  if (!conn) return res.status(200).json({ connected: false })

  return res.status(200).json({
    connected: true,
    containerId: conn.containerId ?? null,
    containerName: conn.containerName,
    host: conn.host,
    port: conn.port,
    user: conn.user,
    database: conn.database,
  })
}
