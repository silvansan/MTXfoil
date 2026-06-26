import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('superadmin', 'admin', 'operator', 'viewer');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'active', 'archived');
  CREATE TYPE "public"."enum_streams_enabled_protocols" AS ENUM('srt', 'rtmp', 'rtsp', 'hls', 'webrtc');
  CREATE TYPE "public"."enum_streams_status" AS ENUM('idle', 'live', 'offline', 'error');
  CREATE TYPE "public"."enum_streams_source_type" AS ENUM('publisher', 'proxy', 'redirect', 'test');
  CREATE TYPE "public"."enum_streams_auth_mode" AS ENUM('public', 'unlisted', 'password', 'token', 'internal', 'external', 'jwt');
  CREATE TYPE "public"."enum_forwarding_jobs_type" AS ENUM('srt-push', 'rtmp-push', 'hls-pull');
  CREATE TYPE "public"."enum_forwarding_jobs_worker_status" AS ENUM('idle', 'running', 'error', 'stopped');
  CREATE TYPE "public"."enum_cors_presets_services" AS ENUM('api', 'hls', 'webrtc', 'playback', 'metrics');
  CREATE TYPE "public"."enum_protocol_settings_hls_variant" AS ENUM('mpegts', 'fmp4');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'operator' NOT NULL,
  	"display_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"date" timestamp(3) with time zone,
  	"status" "enum_events_status" DEFAULT 'draft',
  	"description" varchar,
  	"default_domain" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "streams_enabled_protocols" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_streams_enabled_protocols",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "streams" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"event_id" integer,
  	"status" "enum_streams_status" DEFAULT 'idle',
  	"enabled" boolean DEFAULT true,
  	"source_type" "enum_streams_source_type" DEFAULT 'publisher',
  	"source_url" varchar,
  	"recording_enabled" boolean DEFAULT false,
  	"playback_enabled" boolean DEFAULT true,
  	"auth_mode" "enum_streams_auth_mode" DEFAULT 'internal',
  	"publish_password" varchar,
  	"read_password" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forwarding_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"stream_id" integer NOT NULL,
  	"type" "enum_forwarding_jobs_type" DEFAULT 'srt-push' NOT NULL,
  	"destination_url" varchar NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"auto_start" boolean DEFAULT true,
  	"restart_on_failure" boolean DEFAULT true,
  	"notes" varchar,
  	"worker_status" "enum_forwarding_jobs_worker_status" DEFAULT 'idle',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cors_presets_origins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origin" varchar NOT NULL
  );
  
  CREATE TABLE "cors_presets_services" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_cors_presets_services",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cors_presets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"events_id" integer,
  	"streams_id" integer,
  	"forwarding_jobs_id" integer,
  	"cors_presets_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "system_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"public_stream_domain" varchar DEFAULT 'localhost',
  	"connection_test_interval" numeric DEFAULT 5,
  	"ports_srt" numeric DEFAULT 8890,
  	"ports_rtmp" numeric DEFAULT 1935,
  	"ports_rtmps" numeric DEFAULT 1936,
  	"ports_rtsp" numeric DEFAULT 8554,
  	"ports_hls" numeric DEFAULT 8888,
  	"ports_webrtc_http" numeric DEFAULT 8889,
  	"ports_webrtc_ice" numeric DEFAULT 8189,
  	"url_templates_srt_publish" varchar DEFAULT 'srt://{domain}:{srtPort}?streamid=publish:{path}',
  	"url_templates_srt_read" varchar DEFAULT 'srt://{domain}:{srtPort}?streamid=read:{path}',
  	"url_templates_rtmp_publish" varchar DEFAULT 'rtmp://{domain}:{rtmpPort}/{path}',
  	"url_templates_hls_playback" varchar DEFAULT '{hlsBaseUrl}/{path}/index.m3u8',
  	"url_templates_webrtc_playback" varchar DEFAULT '{webrtcBaseUrl}/{path}',
  	"hls_base_url" varchar,
  	"webrtc_base_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "protocol_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"srt_enabled" boolean DEFAULT true,
  	"srt_address" varchar DEFAULT ':8890',
  	"srt_publish_passphrase" varchar,
  	"rtmp_enabled" boolean DEFAULT true,
  	"rtmp_address" varchar DEFAULT ':1935',
  	"rtmps_enabled" boolean DEFAULT true,
  	"rtmps_address" varchar DEFAULT ':1936',
  	"hls_enabled" boolean DEFAULT true,
  	"hls_address" varchar DEFAULT ':8888',
  	"hls_variant" "enum_protocol_settings_hls_variant" DEFAULT 'mpegts',
  	"webrtc_enabled" boolean DEFAULT true,
  	"webrtc_address" varchar DEFAULT ':8889',
  	"rtsp_enabled" boolean DEFAULT true,
  	"rtsp_address" varchar DEFAULT ':8554',
  	"api_enabled" boolean DEFAULT true,
  	"metrics_enabled" boolean DEFAULT true,
  	"playback_enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cors_origins_api_allow_origins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origin" varchar
  );
  
  CREATE TABLE "cors_origins_hls_allow_origins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origin" varchar
  );
  
  CREATE TABLE "cors_origins_webrtc_allow_origins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origin" varchar
  );
  
  CREATE TABLE "cors_origins_playback_allow_origins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origin" varchar
  );
  
  CREATE TABLE "cors_origins_metrics_allow_origins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origin" varchar
  );
  
  CREATE TABLE "cors_origins_trusted_proxies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"proxy" varchar
  );
  
  CREATE TABLE "cors_origins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "streams_enabled_protocols" ADD CONSTRAINT "streams_enabled_protocols_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "streams" ADD CONSTRAINT "streams_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forwarding_jobs" ADD CONSTRAINT "forwarding_jobs_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cors_presets_origins" ADD CONSTRAINT "cors_presets_origins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_presets_services" ADD CONSTRAINT "cors_presets_services_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cors_presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_streams_fk" FOREIGN KEY ("streams_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forwarding_jobs_fk" FOREIGN KEY ("forwarding_jobs_id") REFERENCES "public"."forwarding_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cors_presets_fk" FOREIGN KEY ("cors_presets_id") REFERENCES "public"."cors_presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_origins_api_allow_origins" ADD CONSTRAINT "cors_origins_api_allow_origins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_origins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_origins_hls_allow_origins" ADD CONSTRAINT "cors_origins_hls_allow_origins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_origins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_origins_webrtc_allow_origins" ADD CONSTRAINT "cors_origins_webrtc_allow_origins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_origins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_origins_playback_allow_origins" ADD CONSTRAINT "cors_origins_playback_allow_origins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_origins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_origins_metrics_allow_origins" ADD CONSTRAINT "cors_origins_metrics_allow_origins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_origins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_origins_trusted_proxies" ADD CONSTRAINT "cors_origins_trusted_proxies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_origins"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "streams_enabled_protocols_order_idx" ON "streams_enabled_protocols" USING btree ("order");
  CREATE INDEX "streams_enabled_protocols_parent_idx" ON "streams_enabled_protocols" USING btree ("parent_id");
  CREATE UNIQUE INDEX "streams_slug_idx" ON "streams" USING btree ("slug");
  CREATE INDEX "streams_event_idx" ON "streams" USING btree ("event_id");
  CREATE INDEX "streams_updated_at_idx" ON "streams" USING btree ("updated_at");
  CREATE INDEX "streams_created_at_idx" ON "streams" USING btree ("created_at");
  CREATE INDEX "forwarding_jobs_stream_idx" ON "forwarding_jobs" USING btree ("stream_id");
  CREATE INDEX "forwarding_jobs_updated_at_idx" ON "forwarding_jobs" USING btree ("updated_at");
  CREATE INDEX "forwarding_jobs_created_at_idx" ON "forwarding_jobs" USING btree ("created_at");
  CREATE INDEX "cors_presets_origins_order_idx" ON "cors_presets_origins" USING btree ("_order");
  CREATE INDEX "cors_presets_origins_parent_id_idx" ON "cors_presets_origins" USING btree ("_parent_id");
  CREATE INDEX "cors_presets_services_order_idx" ON "cors_presets_services" USING btree ("order");
  CREATE INDEX "cors_presets_services_parent_idx" ON "cors_presets_services" USING btree ("parent_id");
  CREATE INDEX "cors_presets_updated_at_idx" ON "cors_presets" USING btree ("updated_at");
  CREATE INDEX "cors_presets_created_at_idx" ON "cors_presets" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_streams_id_idx" ON "payload_locked_documents_rels" USING btree ("streams_id");
  CREATE INDEX "payload_locked_documents_rels_forwarding_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("forwarding_jobs_id");
  CREATE INDEX "payload_locked_documents_rels_cors_presets_id_idx" ON "payload_locked_documents_rels" USING btree ("cors_presets_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "cors_origins_api_allow_origins_order_idx" ON "cors_origins_api_allow_origins" USING btree ("_order");
  CREATE INDEX "cors_origins_api_allow_origins_parent_id_idx" ON "cors_origins_api_allow_origins" USING btree ("_parent_id");
  CREATE INDEX "cors_origins_hls_allow_origins_order_idx" ON "cors_origins_hls_allow_origins" USING btree ("_order");
  CREATE INDEX "cors_origins_hls_allow_origins_parent_id_idx" ON "cors_origins_hls_allow_origins" USING btree ("_parent_id");
  CREATE INDEX "cors_origins_webrtc_allow_origins_order_idx" ON "cors_origins_webrtc_allow_origins" USING btree ("_order");
  CREATE INDEX "cors_origins_webrtc_allow_origins_parent_id_idx" ON "cors_origins_webrtc_allow_origins" USING btree ("_parent_id");
  CREATE INDEX "cors_origins_playback_allow_origins_order_idx" ON "cors_origins_playback_allow_origins" USING btree ("_order");
  CREATE INDEX "cors_origins_playback_allow_origins_parent_id_idx" ON "cors_origins_playback_allow_origins" USING btree ("_parent_id");
  CREATE INDEX "cors_origins_metrics_allow_origins_order_idx" ON "cors_origins_metrics_allow_origins" USING btree ("_order");
  CREATE INDEX "cors_origins_metrics_allow_origins_parent_id_idx" ON "cors_origins_metrics_allow_origins" USING btree ("_parent_id");
  CREATE INDEX "cors_origins_trusted_proxies_order_idx" ON "cors_origins_trusted_proxies" USING btree ("_order");
  CREATE INDEX "cors_origins_trusted_proxies_parent_id_idx" ON "cors_origins_trusted_proxies" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "streams_enabled_protocols" CASCADE;
  DROP TABLE "streams" CASCADE;
  DROP TABLE "forwarding_jobs" CASCADE;
  DROP TABLE "cors_presets_origins" CASCADE;
  DROP TABLE "cors_presets_services" CASCADE;
  DROP TABLE "cors_presets" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "system_settings" CASCADE;
  DROP TABLE "protocol_settings" CASCADE;
  DROP TABLE "cors_origins_api_allow_origins" CASCADE;
  DROP TABLE "cors_origins_hls_allow_origins" CASCADE;
  DROP TABLE "cors_origins_webrtc_allow_origins" CASCADE;
  DROP TABLE "cors_origins_playback_allow_origins" CASCADE;
  DROP TABLE "cors_origins_metrics_allow_origins" CASCADE;
  DROP TABLE "cors_origins_trusted_proxies" CASCADE;
  DROP TABLE "cors_origins" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum_streams_enabled_protocols";
  DROP TYPE "public"."enum_streams_status";
  DROP TYPE "public"."enum_streams_source_type";
  DROP TYPE "public"."enum_streams_auth_mode";
  DROP TYPE "public"."enum_forwarding_jobs_type";
  DROP TYPE "public"."enum_forwarding_jobs_worker_status";
  DROP TYPE "public"."enum_cors_presets_services";
  DROP TYPE "public"."enum_protocol_settings_hls_variant";`)
}
