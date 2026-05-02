CREATE TABLE "commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"sha" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_number" bigserial NOT NULL,
	"run_id" uuid NOT NULL,
	"iteration_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iterations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"n" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"input_tokens" integer,
	"output_tokens" integer,
	"cache_read_input_tokens" integer,
	"cache_creation_input_tokens" integer,
	"session_id" text,
	"session_file_path" text
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"status" text NOT NULL,
	"process_pid" integer,
	"watchtower_version" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"git_remote_url" text,
	"local_path" text,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"task_id" uuid,
	"name" text NOT NULL,
	"agent_provider" text NOT NULL,
	"agent_model" text,
	"sandbox_provider" text NOT NULL,
	"branch" text,
	"max_iterations" integer,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"status" text NOT NULL,
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"completion_signal" text,
	"config_snapshot" jsonb NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"branch" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commits" ADD CONSTRAINT "commits_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_iteration_id_iterations_id_fk" FOREIGN KEY ("iteration_id") REFERENCES "public"."iterations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iterations" ADD CONSTRAINT "iterations_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_sequence_number_unique" ON "events" USING btree ("sequence_number");--> statement-breakpoint
CREATE UNIQUE INDEX "iterations_run_n_unique" ON "iterations" USING btree ("run_id","n");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_git_remote_url_unique" ON "projects" USING btree ("git_remote_url");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_local_path_unique" ON "projects" USING btree ("local_path");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_job_external_id_unique" ON "tasks" USING btree ("job_id","external_id");
