import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import type { Project } from 'generated/prisma/browser'

type LogglySettingsProps = {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogglySettings({
  projectId,
  open,
  onOpenChange,
}: LogglySettingsProps) {
  const queryClient = useQueryClient()

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () =>
      axios.get<Project>(`/api/projects/${projectId}`).then((res) => res.data),
  })

  const projectRecord = project as unknown as Record<string, string> | undefined

  const [subdomain, setSubdomain] = useState('')
  const [token, setToken] = useState('')
  const [tag, setTag] = useState('')

  // Sync form state when project data loads
  const [initialized, setInitialized] = useState(false)
  if (project && !initialized) {
    setSubdomain(projectRecord?.logglySubdomain ?? '')
    setToken(projectRecord?.logglyToken ?? '')
    setTag(projectRecord?.logglyTag ?? '')
    setInitialized(true)
  }

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: () =>
      axios
        .patch(`/api/projects/${projectId}`, {
          logglySubdomain: subdomain,
          logglyToken: token,
          logglyTag: tag,
        })
        .then((res) => res.data),
    onSuccess: () => {
      toast.success('Loggly settings saved')
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Failed to save Loggly settings')
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Loggly Settings</SheetTitle>
          <SheetDescription>
            Connect this project to your Loggly account to sync and archive
            logs locally.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loggly-subdomain">Subdomain</Label>
            <Input
              id="loggly-subdomain"
              placeholder="your-subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Loggly subdomain (e.g. &quot;mycompany&quot; for
              mycompany.loggly.com)
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loggly-token">API Token</Label>
            <Input
              id="loggly-token"
              type="password"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Loggly API token for authentication
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loggly-tag">Tag (optional)</Label>
            <Input
              id="loggly-tag"
              placeholder="production"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Filter logs by this Loggly tag when syncing
            </p>
          </div>
        </div>

        <SheetFooter>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => saveSettings()}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
