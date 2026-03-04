import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/lib/prisma'
import { logglyEvents, logglySearch, mapLogglyLevel } from '@/lib/loggly'

export const Route = createFileRoute('/api/projects/$projectId/logs/sync')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { projectId } = params

        const project = await prisma.project.findUnique({
          where: { id: projectId },
        })

        if (!project) {
          return new Response(JSON.stringify({ error: 'Project not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (!project.logglySubdomain || !project.logglyToken) {
          return new Response(
            JSON.stringify({ error: 'Project is not configured with Loggly credentials' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        // Parse optional body for search parameters
        let query = '*'
        let from = '-24h'
        let until = 'now'

        try {
          const body = await request.json()
          if (body.query) query = body.query
          if (body.from) from = body.from
          if (body.until) until = body.until
        } catch {
          // No body or invalid JSON is fine — use defaults
        }

        // If a tag is configured, scope the query to that tag
        if (project.logglyTag) {
          query = query === '*'
            ? `tag:"${project.logglyTag}"`
            : `(${query}) AND tag:"${project.logglyTag}"`
        }

        try {
          const rsid = await logglySearch(
            project.logglySubdomain,
            project.logglyToken,
            query,
            from,
            until,
          )

          let totalSynced = 0
          let page = 0
          let hasMore = true

          while (hasMore) {
            const result = await logglyEvents(
              project.logglySubdomain,
              project.logglyToken,
              rsid,
              page,
            )

            if (result.events.length === 0) {
              hasMore = false
              break
            }

            for (const evt of result.events) {
              const logglyId = evt.id

              // Skip if already stored
              const existing = await prisma.log.findUnique({
                where: { logglyId },
              })
              if (existing) continue

              await prisma.log.create({
                data: {
                  logglyId,
                  content: { value: evt.event },
                  level: mapLogglyLevel(evt.event),
                  createdAt: new Date(evt.timestamp),
                  project: { connect: { id: projectId } },
                },
              })
              totalSynced++
            }

            page++
            // Loggly returns up to 50 events per page by default
            if (result.events.length < 50) {
              hasMore = false
            }
          }

          return new Response(
            JSON.stringify({ synced: totalSynced, total_events: totalSynced }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return new Response(
            JSON.stringify({ error: `Loggly sync failed: ${message}` }),
            {
              status: 502,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
