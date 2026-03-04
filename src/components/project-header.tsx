import {
  RiClipboardLine,
  RiLoopLeftLine,
  RiMoreLine,
  RiSearchLine,
  RiSettings3Line,
} from '@remixicon/react'
import { useHotkey } from '@tanstack/react-hotkeys'
import Mark from 'mark.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from './ui/breadcrumb'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from './ui/input-group'
import { Separator } from './ui/separator'
import { SidebarTrigger } from './ui/sidebar'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { LogglySettings } from './loggly-settings'
import type { Project } from 'generated/prisma/browser'
import { Route } from '@/routes/projects.$projectId.route'
import { copyToClipboard } from '@/lib/clipboard'
import { isLogglyConfigured } from '@/lib/utils'

export function ProjectHeader() {
  // Helpers
  const mark = useMemo(() => new Mark('.logs'), [])

  // Router state
  const { projectId } = Route.useParams()

  // Server state
  const queryClient = useQueryClient()

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () =>
      axios.get<Project>(`/api/projects/${projectId}`).then((res) => res.data),
  })

  const { mutate: syncLogs, isPending: isSyncing } = useMutation({
    mutationFn: () =>
      axios
        .post(`/api/projects/${projectId}/logs/sync`, {})
        .then((res) => res.data),
    onSuccess: (res: { synced: number }) => {
      toast.success(`Synced ${res.synced} log(s) from Loggly`)
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'logs'],
      })
    },
    onError: () => {
      toast.error('Failed to sync logs from Loggly')
    },
  })

  const logglyConfigured = isLogglyConfigured(project)

  // Auto-sync from Loggly every 60 seconds when credentials are configured
  const autoSync = useCallback(async () => {
    if (!logglyConfigured) return
    try {
      const res = await axios
        .post(`/api/projects/${projectId}/logs/sync`, {})
        .then((r) => r.data as { synced: number })
      if (res.synced > 0) {
        queryClient.invalidateQueries({
          queryKey: ['projects', projectId, 'logs'],
        })
      }
    } catch {
      // Silently ignore auto-sync failures
    }
  }, [logglyConfigured, projectId, queryClient])

  useEffect(() => {
    if (!logglyConfigured) return
    autoSync()
    const interval = setInterval(autoSync, 60_000)
    return () => clearInterval(interval)
  }, [logglyConfigured, autoSync])

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts
  useHotkey('Mod+F', (e) => {
    e.preventDefault()
    e.stopPropagation()

    searchInputRef.current?.focus()
  })

  // Local state
  const [matchCount, setMatchCount] = useState<number>()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b px-4 sticky top-0 bg-background z-10">
      <div className="flex gap-2 items-center">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{project?.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex-1 flex gap-2.5">
        <InputGroup className="flex-1">
          <InputGroupInput
            ref={searchInputRef}
            placeholder="Search logs..."
            onChange={(e) => {
              mark.unmark()
              mark.mark(e.currentTarget.value, {
                done: (newMatchCount) => {
                  if (e.currentTarget.value) {
                    setMatchCount(newMatchCount)
                  } else {
                    setMatchCount(undefined)
                  }
                },
              })
            }}
          />
          {typeof matchCount === 'number' && (
            <InputGroupAddon align="inline-end">
              <InputGroupText>
                {matchCount.toLocaleString()} result(s)
              </InputGroupText>
            </InputGroupAddon>
          )}
          <InputGroupAddon align="inline-end">
            <RiSearchLine />
          </InputGroupAddon>
        </InputGroup>

        {logglyConfigured && (
          <Button
            size="sm"
            variant="outline"
            disabled={isSyncing}
            onClick={() => syncLogs()}
          >
            <RiLoopLeftLine className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync from Loggly'}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <RiMoreLine />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48" align="end">
            <DropdownMenuItem
              onSelect={() => {
                toast.promise(
                  axios.get('/api/ip').then((res) => {
                    const url = `http://${res.data}:${window.location.port}/api/projects/${projectId}/logs/ingest`

                    return copyToClipboard(url)
                  }),
                  {
                    loading: 'Loading...',
                    success: `POST URL copied to clipboard`,
                    error: 'Failed to copy POST URL to clipboard',
                  },
                )
              }}
            >
              <RiClipboardLine />
              Copy POST URL
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <RiSettings3Line />
              Loggly Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <LogglySettings
        projectId={projectId}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </header>
  )
}
