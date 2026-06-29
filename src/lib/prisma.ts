import { PrismaClient } from '@prisma/client'
import { prismaTenantExtension } from './prisma-tenant-extension'

const prismaClientSingleton = () => {
  return new PrismaClient().$extends(prismaTenantExtension)
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export { prisma }
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
