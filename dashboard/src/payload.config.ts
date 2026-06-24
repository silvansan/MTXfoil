import { config as loadEnv } from 'dotenv'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

loadEnv()

import { validateProductionEnv, requirePayloadSecret } from './lib/env-validation'
import { CorsPresets } from './collections/CorsPresets'
import { Events } from './collections/Events'
import { ForwardingJobs } from './collections/ForwardingJobs'
import { Streams } from './collections/Streams'
import { Users } from './collections/Users'
import { CorsOrigins } from './globals/CorsOrigins'
import { ProtocolSettings } from './globals/ProtocolSettings'
import { SystemSettings } from './globals/SystemSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

validateProductionEnv()

const databaseUrl = process.env.DATABASE_URL || ''
const pushDatabaseSchema = process.env.PAYLOAD_DB_PUSH !== 'false'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— MTXfoil',
    },
  },
  collections: [Users, Events, Streams, ForwardingJobs, CorsPresets],
  globals: [SystemSettings, ProtocolSettings, CorsOrigins],
  editor: lexicalEditor(),
  secret: requirePayloadSecret(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
    },
    push: pushDatabaseSchema,
  }),
  sharp,
})
