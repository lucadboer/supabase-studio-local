import { ChevronDown, Database, LogOut, Repeat } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'ui'

import { IS_PLATFORM } from '@/lib/constants'

type Session =
  | { connected: false }
  | {
      connected: true
      containerId: string | null
      containerName: string
      host: string
      port: number
      user: string
      database: string
    }

export function useLocalSession(refreshKey?: string) {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (IS_PLATFORM) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/local/session')
        const json = (await r.json()) as Session
        if (!cancelled) setSession(json)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return session
}

export function LocalSwitcherInline({ className }: { className?: string }) {
  const router = useRouter()
  const session = useLocalSession(router.asPath)

  if (IS_PLATFORM) return null
  if (router.pathname.startsWith('/local-connect')) return null
  if (!session || !session.connected) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="default"
          size="tiny"
          icon={<Database size={13} className="text-brand" />}
          iconRight={<ChevronDown size={12} className="text-foreground-lighter" />}
          className={cn('h-[26px]', className)}
        >
          <span className="font-mono text-[11px] text-foreground">{session.containerName}</span>
          <Badge variant="default" className="ml-2 h-[18px] px-1.5 text-[10px]">
            :{session.port}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="space-y-1">
          <div className="text-[10px] font-medium uppercase tracking-wider text-foreground-lighter">
            Active connection
          </div>
          <div className="font-mono text-xs text-foreground">
            {session.user}@{session.host}:{session.port}
          </div>
          <div className="font-mono text-xs text-foreground-light">{session.database}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/local-connect')}>
          <Repeat size={14} className="mr-2" /> Switch database
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await fetch('/api/local/connect', { method: 'DELETE' })
            router.push('/local-connect')
          }}
          className="text-warning"
        >
          <LogOut size={14} className="mr-2" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LocalSwitcher() {
  return null
}
