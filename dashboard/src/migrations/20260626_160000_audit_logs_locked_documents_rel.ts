import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Payload locked-documents rel row per collection — required when AuditLogs was added. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels"
    ADD COLUMN IF NOT EXISTS "audit_logs_id" integer;

  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk"
      FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id")
      ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audit_logs_id_idx"
    ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels"
    DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_audit_logs_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_audit_logs_id_idx";
  ALTER TABLE "payload_locked_documents_rels"
    DROP COLUMN IF EXISTS "audit_logs_id";
  `)
}
