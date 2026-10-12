CREATE TABLE IF NOT EXISTS "_migrations_check" (
	"id" serial PRIMARY KEY NOT NULL,
	"migration_name" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
