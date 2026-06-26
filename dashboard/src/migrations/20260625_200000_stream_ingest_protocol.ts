import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_streams_ingest_protocol" AS ENUM('srt', 'rtmp', 'rtmps', 'rtsp', 'webrtc');
  ALTER TABLE "streams" ADD COLUMN IF NOT EXISTS "ingest_protocol" "enum_streams_ingest_protocol" DEFAULT 'srt';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "streams" DROP COLUMN IF EXISTS "ingest_protocol";
  DROP TYPE IF EXISTS "public"."enum_streams_ingest_protocol";
  `)
}
