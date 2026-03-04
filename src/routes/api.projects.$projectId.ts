import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/lib/prisma'

export const Route = createFileRoute('/api/projects/$projectId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { projectId } = params

        const project = await prisma.project.findUnique({
          where: {
            id: projectId,
          },
        })

        return new Response(JSON.stringify(project), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
      PATCH: async ({ request, params }) => {
        const { projectId } = params
        const body = await request.json()

        const data: Record<string, unknown> = {}
        if (typeof body.title === 'string') data.title = body.title
        if (typeof body.logglySubdomain === 'string') data.logglySubdomain = body.logglySubdomain || null
        if (typeof body.logglyToken === 'string') data.logglyToken = body.logglyToken || null
        if (typeof body.logglyTag === 'string') data.logglyTag = body.logglyTag || null

        const project = await prisma.project.update({
          where: { id: projectId },
          data,
        })

        return new Response(JSON.stringify(project), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
    },
  },
})
