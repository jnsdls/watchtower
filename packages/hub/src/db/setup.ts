import { join } from "node:path";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { HubDatabase } from "./client";

const migrationsFolder = join(process.cwd(), "drizzle");

export const applyDatabaseMigrations = async (db: HubDatabase) => {
  await migrate(db, { migrationsFolder });
};

export const applyDatabaseSchema = async (db: HubDatabase) => {
  await db.$client.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      git_remote_url text,
      local_path text,
      display_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS projects_git_remote_url_unique
      ON projects (git_remote_url) WHERE git_remote_url IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS projects_local_path_unique
      ON projects (local_path) WHERE local_path IS NOT NULL;

    CREATE TABLE IF NOT EXISTS jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id),
      started_at timestamptz NOT NULL,
      ended_at timestamptz,
      status text NOT NULL,
      process_pid integer,
      watchtower_version text
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id uuid NOT NULL REFERENCES jobs(id),
      external_id text NOT NULL,
      title text NOT NULL,
      branch text,
      status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tasks_job_external_id_unique
      ON tasks (job_id, external_id);

    CREATE TABLE IF NOT EXISTS runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id uuid NOT NULL REFERENCES jobs(id),
      task_id uuid REFERENCES tasks(id),
      name text NOT NULL,
      agent_provider text NOT NULL,
      agent_model text,
      sandbox_provider text NOT NULL,
      branch text,
      max_iterations integer,
      started_at timestamptz NOT NULL,
      ended_at timestamptz,
      status text NOT NULL,
      completion_signal text,
      config_snapshot jsonb NOT NULL,
      error_message text
    );

    CREATE TABLE IF NOT EXISTS iterations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id uuid NOT NULL REFERENCES runs(id),
      n integer NOT NULL,
      started_at timestamptz NOT NULL,
      ended_at timestamptz,
      input_tokens integer,
      output_tokens integer,
      cache_read_input_tokens integer,
      cache_creation_input_tokens integer,
      session_id text,
      session_file_path text
    );
    CREATE UNIQUE INDEX IF NOT EXISTS iterations_run_n_unique
      ON iterations (run_id, n);

    CREATE TABLE IF NOT EXISTS events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_number bigserial NOT NULL,
      run_id uuid NOT NULL REFERENCES runs(id),
      iteration_id uuid REFERENCES iterations(id),
      type text NOT NULL,
      payload jsonb NOT NULL,
      timestamp timestamptz NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS events_sequence_number_unique
      ON events (sequence_number);

    CREATE TABLE IF NOT EXISTS commits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id uuid NOT NULL REFERENCES runs(id),
      sha text NOT NULL
    );
  `);
};
