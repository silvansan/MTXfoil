import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "public"."enum_protocol_settings_auth_method" AS ENUM('internal', 'http', 'jwt');
   EXCEPTION WHEN duplicate_object THEN null; END $$;
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "auth_method" "enum_protocol_settings_auth_method" DEFAULT 'internal';
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "auth_http_address" varchar;
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "auth_jwt_jwks" varchar;
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "auth_jwt_claim_key" varchar DEFAULT 'mediamtx_permissions';
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "auth_jwt_issuer" varchar;
  ALTER TABLE "protocol_settings" ADD COLUMN IF NOT EXISTS "auth_jwt_audience" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "auth_method";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "auth_http_address";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "auth_jwt_jwks";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "auth_jwt_claim_key";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "auth_jwt_issuer";
  ALTER TABLE "protocol_settings" DROP COLUMN IF EXISTS "auth_jwt_audience";
  DROP TYPE IF EXISTS "public"."enum_protocol_settings_auth_method";
  `)
}
