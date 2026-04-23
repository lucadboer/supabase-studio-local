import Docker from 'dockerode'
import type { NextApiRequest, NextApiResponse } from 'next'

import apiWrapper from '@/lib/api/apiWrapper'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

export type DiscoveredPostgres = {
  id: string
  name: string
  image: string
  host: string
  port: number
  defaultUser: string
  defaultDatabase: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  try {
    const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
    const docker = new Docker({ socketPath })
    const containers = await docker.listContainers({ all: false })

    const hostOverride = process.env.DOCKER_POSTGRES_HOST || 'host.docker.internal'
    const results: DiscoveredPostgres[] = []

    for (const c of containers) {
      const image = c.Image || ''
      const looksLikePostgres =
        /postgres|pgvector|timescale|supabase\/postgres/i.test(image) ||
        (c.Labels && c.Labels['studio.local.postgres'] === 'true')
      if (!looksLikePostgres) continue

      const mapped = c.Ports.find((p) => p.PrivatePort === 5432 && p.PublicPort)
      if (!mapped) continue

      const env = await readEnv(docker, c.Id)
      results.push({
        id: c.Id,
        name: (c.Names?.[0] || c.Id).replace(/^\//, ''),
        image,
        host: hostOverride,
        port: mapped.PublicPort,
        defaultUser: env.POSTGRES_USER || 'postgres',
        defaultDatabase: env.POSTGRES_DB || env.POSTGRES_USER || 'postgres',
      })
    }

    return res.status(200).json({ databases: results })
  } catch (err: any) {
    return res.status(500).json({
      error: {
        message: `Failed to read Docker socket: ${err?.message ?? err}. Make sure /var/run/docker.sock is mounted into this container.`,
      },
    })
  }
}

async function readEnv(
  docker: Docker,
  containerId: string
): Promise<Record<string, string>> {
  try {
    const info = await docker.getContainer(containerId).inspect()
    const env = info.Config?.Env || []
    return env.reduce<Record<string, string>>((acc, line) => {
      const eq = line.indexOf('=')
      if (eq < 0) return acc
      acc[line.slice(0, eq)] = line.slice(eq + 1)
      return acc
    }, {})
  } catch {
    return {}
  }
}
