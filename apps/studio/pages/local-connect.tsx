import { ArrowRight, Check, Copy, Database, Hash, Info, LogOut, RefreshCw, Server } from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input_Shadcn_,
  Label_Shadcn_,
} from 'ui'

import type { DiscoveredPostgres } from './api/local/discover'

type DiscoverResponse =
  | { databases: DiscoveredPostgres[]; error?: undefined }
  | { databases?: undefined; error: { message: string } }

type SessionResponse =
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

type Preview = {
  version: string | null
  databaseSize: string | null
  databaseSizeBytes: number | null
  schemasCount: number | null
  tablesCount: number | null
}

export default function LocalConnectPage() {
  const router = useRouter()
  const [items, setItems] = useState<DiscoveredPostgres[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [selected, setSelected] = useState<DiscoveredPostgres | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [discover, sess] = await Promise.all([
        fetch('/api/local/discover').then((r) => r.json() as Promise<DiscoverResponse>),
        fetch('/api/local/session').then((r) => r.json() as Promise<SessionResponse>),
      ])
      if (discover.error) setError(discover.error.message)
      else setItems(discover.databases ?? [])
      setSession(sess)
    } catch (err: any) {
      setError(err?.message ?? 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function openDialog(item: DiscoveredPostgres) {
    setSelected(item)
    setDialogOpen(true)
  }

  async function disconnect() {
    await fetch('/api/local/connect', { method: 'DELETE' })
    refresh()
  }

  return (
    <div className="min-h-screen bg-studio text-foreground">
      <div className="mx-auto w-full max-w-6xl px-8 py-16">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-foreground-lighter">
              <Database size={12} />
              Supabase Studio Local
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground">
              Pick a Postgres
            </h1>
            <p className="text-sm text-foreground-light">
              {items.length} {items.length === 1 ? 'container' : 'containers'} detected on your
              Docker daemon.
            </p>
          </div>
          <Button
            type="default"
            icon={<RefreshCw size={14} />}
            onClick={refresh}
            loading={loading}
          >
            Refresh
          </Button>
        </header>

        {session?.connected && (
          <div className="mb-10 overflow-hidden rounded-lg border border-brand-400 bg-brand-200/30">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-400/30 text-brand">
                  <Database size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Connected</span>
                    <Badge variant="success" className="text-[10px]">
                      Active
                    </Badge>
                  </div>
                  <div className="truncate font-mono text-xs text-foreground-light">
                    {session.user}@{session.host}:{session.port}/{session.database}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="primary"
                  iconRight={<ArrowRight size={14} />}
                  onClick={() =>
                    router.push(
                      `/project/${process.env.NEXT_PUBLIC_DEFAULT_PROJECT_REF || 'default'}`
                    )
                  }
                >
                  Open Studio
                </Button>
                <Button type="warning" icon={<LogOut size={14} />} onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-md border border-destructive-400 bg-destructive-200/40 px-4 py-3 text-sm text-destructive-600">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-strong bg-surface-100 px-6 py-14 text-center">
            <Database className="mx-auto text-foreground-lighter" size={28} />
            <p className="mt-3 text-sm font-medium text-foreground">
              No running Postgres container found
            </p>
            <p className="mt-1 text-xs text-foreground-light">
              Start one with a{' '}
              <code className="rounded bg-surface-200 px-1.5 py-0.5">postgres</code>,{' '}
              <code className="rounded bg-surface-200 px-1.5 py-0.5">pgvector</code> or similar
              image and click Refresh.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const active = session?.connected && session.containerId === item.id
            return (
              <Card
                key={item.id}
                className={cn(
                  'group relative cursor-pointer transition-all hover:border-foreground-muted hover:shadow-sm',
                  active && 'border-brand-400 ring-1 ring-brand-400/40'
                )}
                onClick={() => openDialog(item)}
              >
                <CardContent className="p-6">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-strong bg-surface-100 text-foreground-light">
                          <Database size={14} />
                        </div>
                        <h3 className="truncate font-mono text-sm font-medium text-foreground">
                          {item.name}
                        </h3>
                      </div>
                      <p className="truncate pl-9 text-xs text-foreground-lighter">
                        {item.image}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {active && (
                        <Badge variant="success" className="text-[10px]">
                          Active
                        </Badge>
                      )}
                      <ArrowRight
                        size={14}
                        className="text-foreground-lighter transition-transform group-hover:translate-x-0.5 group-hover:text-foreground-light"
                      />
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-6 border-t border-overlay pt-4">
                    <InfoCell icon={<Hash size={11} />} label="Port" value={String(item.port)} />
                    <InfoCell
                      icon={<Database size={11} />}
                      label="Database"
                      value={item.defaultDatabase}
                    />
                    <InfoCell
                      icon={<Server size={11} />}
                      label="User"
                      value={item.defaultUser}
                    />
                  </dl>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <ConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selected}
        onConnected={() => {
          setDialogOpen(false)
          router.push(`/project/${process.env.NEXT_PUBLIC_DEFAULT_PROJECT_REF || 'default'}`)
        }}
      />
    </div>
  )
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-foreground-lighter">
        {icon}
        {label}
      </dt>
      <dd className="truncate font-mono text-xs text-foreground">{value}</dd>
    </div>
  )
}

function ConnectDialog({
  open,
  onOpenChange,
  item,
  onConnected,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: DiscoveredPostgres | null
  onConnected: () => void
}) {
  const [user, setUser] = useState('')
  const [database, setDatabase] = useState('')
  const [password, setPassword] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState<'idle' | 'testing' | 'connecting'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setUser(item.defaultUser)
    setDatabase(item.defaultDatabase)
    setPassword('')
    setPreview(null)
    setErrMsg(null)
    setBusy('idle')
  }, [item?.id])

  const connStringExternal = useMemo(() => {
    if (!item) return ''
    const pwd = password ? `:${encodeURIComponent(password)}` : ''
    return `postgresql://${encodeURIComponent(user)}${pwd}@localhost:${item.port}/${encodeURIComponent(database)}`
  }, [item, user, password, database])

  const connStringDocker = useMemo(() => {
    if (!item) return ''
    const pwd = password ? `:${encodeURIComponent(password)}` : ''
    return `postgresql://${encodeURIComponent(user)}${pwd}@${item.host}:${item.port}/${encodeURIComponent(database)}`
  }, [item, user, password, database])

  async function submit(previewOnly: boolean) {
    if (!item) return
    setBusy(previewOnly ? 'testing' : 'connecting')
    setErrMsg(null)
    try {
      const r = await fetch('/api/local/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerId: item.id,
          containerName: item.name,
          host: item.host,
          port: item.port,
          user,
          password,
          database,
          preview: previewOnly,
        }),
      })
      const json = await r.json()
      if (r.ok && json.ok) {
        if (previewOnly) {
          setPreview({
            version: json.version ?? null,
            databaseSize: json.databaseSize ?? null,
            databaseSizeBytes: json.databaseSizeBytes ?? null,
            schemasCount: json.schemasCount ?? null,
            tablesCount: json.tablesCount ?? null,
          })
        } else {
          onConnected()
        }
      } else if (r.status === 401) {
        setErrMsg('Incorrect password.')
      } else {
        setErrMsg(json?.error?.message || 'Failed to connect.')
      }
    } catch (err: any) {
      setErrMsg(err?.message ?? 'Unexpected error.')
    } finally {
      setBusy('idle')
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xlarge" className="max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b border-overlay px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-strong bg-surface-100 text-foreground-light">
              <Database size={16} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="font-mono text-base font-medium">{item.name}</DialogTitle>
              <DialogDescription className="truncate font-mono text-xs">
                {item.image}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 px-7 py-6">
          <section className="space-y-4">
            <SectionTitle label="Container address" />
            <div className="grid grid-cols-2 gap-4 rounded-md border border-overlay bg-surface-100 px-4 py-4">
              <ReadOnlyField label="Host" value={item.host} />
              <ReadOnlyField label="Port" value={String(item.port)} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle label="Credentials" />
            <div className="grid gap-5 md:grid-cols-2">
              <FieldGroup label="User">
                <Input_Shadcn_
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="font-mono"
                />
              </FieldGroup>
              <FieldGroup label="Database">
                <Input_Shadcn_
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="font-mono"
                />
              </FieldGroup>
              <FieldGroup
                label="Password"
                description="Leave empty if the database does not require authentication."
                className="md:col-span-2"
              >
                <Input_Shadcn_
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="font-mono"
                />
              </FieldGroup>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle
              label="Connection strings"
              hint="The password is embedded only after you type one above."
            />
            <div className="space-y-3">
              <ConnStringBlock
                label="From the host (apps running outside Docker)"
                value={connStringExternal}
              />
              <ConnStringBlock
                label="From another container (same Docker network)"
                value={connStringDocker}
              />
            </div>
          </section>

          {preview && (
            <section className="space-y-4">
              <SectionTitle label="Database info" />
              <div className="grid grid-cols-3 gap-4 rounded-md border border-overlay bg-surface-100 px-4 py-4">
                <ReadOnlyField label="Size" value={preview.databaseSize ?? '—'} />
                <ReadOnlyField label="Schemas" value={String(preview.schemasCount ?? '—')} />
                <ReadOnlyField label="Tables" value={String(preview.tablesCount ?? '—')} />
              </div>
              {preview.version && (
                <p className="flex items-start gap-2 text-[11px] text-foreground-lighter">
                  <Info size={11} className="mt-0.5 shrink-0" />
                  <span className="font-mono">{preview.version}</span>
                </p>
              )}
            </section>
          )}

          {errMsg && (
            <div className="rounded-md border border-destructive-400 bg-destructive-200/40 px-3 py-2 text-xs text-destructive-600">
              {errMsg}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-overlay px-7 py-4">
          <Button
            type="default"
            onClick={() => submit(true)}
            loading={busy === 'testing'}
            disabled={busy !== 'idle'}
          >
            Test & inspect
          </Button>
          <Button
            type="primary"
            iconRight={<ArrowRight size={14} />}
            onClick={() => submit(false)}
            loading={busy === 'connecting'}
            disabled={busy !== 'idle'}
          >
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h4 className="text-xs font-medium uppercase tracking-wider text-foreground-light">
        {label}
      </h4>
      {hint && <p className="text-xs text-foreground-lighter">{hint}</p>}
    </div>
  )
}

function FieldGroup({
  label,
  description,
  className,
  children,
}: {
  label: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label_Shadcn_ className="text-xs font-medium text-foreground-light">{label}</Label_Shadcn_>
      {children}
      {description && <p className="text-xs text-foreground-lighter">{description}</p>}
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wider text-foreground-lighter">
        {label}
      </div>
      <div className="truncate font-mono text-sm text-foreground">{value}</div>
    </div>
  )
}

function ConnStringBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <div className="space-y-2">
      <Label_Shadcn_ className="text-xs font-medium text-foreground-light">{label}</Label_Shadcn_>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-overlay bg-surface-100 px-3 py-2 font-mono text-xs text-foreground">
          {value}
        </code>
        <Button
          type="default"
          icon={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={onCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export const getServerSideProps = async () => ({ props: {} })
