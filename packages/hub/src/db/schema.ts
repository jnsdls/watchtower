import {
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gitRemoteUrl: text("git_remote_url"),
    localPath: text("local_path"),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("projects_git_remote_url_unique").on(table.gitRemoteUrl),
    uniqueIndex("projects_local_path_unique").on(table.localPath),
  ],
);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: text("status").notNull(),
  processPid: integer("process_pid"),
  title: text("title"),
  template: text("template"),
  watchtowerVersion: text("watchtower_version"),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    branch: text("branch"),
    status: text("status").notNull(),
    failureCount: integer("failure_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tasks_job_external_id_unique").on(
      table.jobId,
      table.externalId,
    ),
  ],
);

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  taskId: uuid("task_id").references(() => tasks.id),
  name: text("name").notNull(),
  agentProvider: text("agent_provider").notNull(),
  agentModel: text("agent_model"),
  sandboxProvider: text("sandbox_provider").notNull(),
  branch: text("branch"),
  maxIterations: integer("max_iterations"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: text("status").notNull(),
  cancelRequested: boolean("cancel_requested").notNull().default(false),
  completionSignal: text("completion_signal"),
  configSnapshot: jsonb("config_snapshot").notNull(),
  errorMessage: text("error_message"),
});

export const iterations = pgTable(
  "iterations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id),
    n: integer("n").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadInputTokens: integer("cache_read_input_tokens"),
    cacheCreationInputTokens: integer("cache_creation_input_tokens"),
    sessionId: text("session_id"),
    sessionFilePath: text("session_file_path"),
  },
  (table) => [uniqueIndex("iterations_run_n_unique").on(table.runId, table.n)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceNumber: bigserial("sequence_number", { mode: "number" }).notNull(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id),
    iterationId: uuid("iteration_id").references(() => iterations.id),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("events_sequence_number_unique").on(table.sequenceNumber),
  ],
);

export const commits = pgTable("commits", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id),
  sha: text("sha").notNull(),
});
