import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "rtmps_server_key" varchar;
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "rtmps_server_cert" varchar;
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "hls_low_latency" boolean DEFAULT false;
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "hls_part_duration" varchar DEFAULT '200ms';
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "hls_segment_duration" varchar DEFAULT '1s';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "rtmps_server_key";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "rtmps_server_cert";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "hls_low_latency";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "hls_part_duration";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "hls_segment_duration";
  `)
}
