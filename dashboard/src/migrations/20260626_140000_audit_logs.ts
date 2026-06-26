import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "public"."enum_audit_logs_action" AS ENUM(
      'config.apply',
      'stream.create',
      'stream.update',
      'stream.delete',
      'user.create',
      'user.update',
      'user.delete',
      'user.role_change',
      'cors.update',
      'cors.preset_apply',
      'protocol.update',
      'forwarding.create',
      'forwarding.update',
      'forwarding.delete'
    );
   EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "action" "enum_audit_logs_action" NOT NULL,
    "actor_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "resource" varchar NOT NULL,
    "resource_id" varchar,
    "summary" varchar NOT NULL,
    "metadata" jsonb,
    "ip" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");
  CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "audit_logs";
   DROP TYPE IF EXISTS "public"."enum_audit_logs_action";
  `)
}
