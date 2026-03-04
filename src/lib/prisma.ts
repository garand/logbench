import { PrismaClient } from '../../generated/prisma/client'

let _prisma: PrismaClient | undefined

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      _prisma = new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
      })
    }
    return Reflect.get(_prisma, prop)
  },
})
