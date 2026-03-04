import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import type { Project } from 'generated/prisma/browser'
import { copyToClipboard } from '@/lib/clipboard'

type CurlExampleProps = {
  projectId: Project['id']
}

export function CurlExample({ projectId }: CurlExampleProps) {
  // Server state
  const { data: ip } = useQuery({
    queryKey: ['ip'],
    queryFn: () => axios.get<string>('/api/ip').then((res) => res.data),
  })

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () =>
      axios.get<Project>(`/api/projects/${projectId}`).then((res) => res.data),
  })

  const projectRecord = project as unknown as Record<string, string> | undefined
  const isLogglyConfigured = Boolean(
    projectRecord && projectRecord.logglySubdomain && projectRecord.logglyToken,
  )

  // Helpers
  const curlCommand = useMemo(
    () =>
      ip
        ? `curl -X POST \\
  'http://${ip}:${window.location.port}/api/projects/${projectId}/logs/ingest' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "content": { "message": "ok" },
    "level": "INFO"
  }'`
        : null,
    [ip, projectId],
  )

  if (isLogglyConfigured) {
    return (
      <div className="p-6 flex-1 flex justify-center items-center flex-col gap-4">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-xl font-medium">
              Loggly is configured
            </p>
            <p className="text-base text-muted-foreground">
              Click the &quot;Sync from Loggly&quot; button in the header to
              fetch and archive your logs locally. Logs are stored in PostgreSQL
              so you have unlimited history beyond Loggly&apos;s 30-day
              retention.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            You can also still send logs directly via the POST API.
          </p>
        </div>
      </div>
    )
  }

  if (!curlCommand) {
    return null
  }

  return (
    <div className="p-6 flex-1 flex justify-center items-center flex-col gap-4">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-xl font-medium">Let&apos;s get started</p>
          <p className="text-base text-muted-foreground">
            Configure Loggly via the settings menu (&hellip;) to sync logs from
            your Loggly account, or send logs directly with the cURL command
            below.
          </p>
        </div>
        <pre className="relative rounded bg-muted/30 border p-3 font-mono text-sm font-medium max-w-fit break-all whitespace-pre-wrap">
          <code>{curlCommand}</code>
        </pre>
        <Button
          className="self-end"
          size="lg"
          type="button"
          onClick={() => {
            toast.promise(copyToClipboard(curlCommand), {
              loading: 'Loading...',
              success: `Command copied to clipboard`,
              error: 'Failed to copy command to clipboard',
            })
          }}
        >
          Copy command
        </Button>
      </div>
    </div>
  )
}
