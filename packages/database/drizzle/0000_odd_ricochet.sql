CREATE TABLE "activities" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"type" varchar(16) NOT NULL,
	"actor_id" varchar(32) NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"description" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" varchar(32) NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"body" text NOT NULL,
	"line_number" integer,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commits" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"sha" varchar(40) NOT NULL,
	"message" text NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"additions" integer DEFAULT 0 NOT NULL,
	"deletions" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(32) DEFAULT 'general' NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_comments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"doc_id" varchar(32) NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"body" text NOT NULL,
	"line_number" integer,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"doc_id" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"message" varchar(255) DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"team_id" varchar(32) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"language" varchar(32) DEFAULT 'typescript' NOT NULL,
	"created_by" varchar(32) NOT NULL,
	"last_edited_by" varchar(32),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_trees" (
	"repo_id" varchar(32) NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "file_trees_repo_id_pk" PRIMARY KEY("repo_id")
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"team_id" varchar(32) NOT NULL,
	"code" varchar(16) NOT NULL,
	"created_by" varchar(32) NOT NULL,
	"max_uses" integer DEFAULT 0 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" bigint,
	"created_at" bigint NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"priority" varchar(8) DEFAULT 'normal' NOT NULL,
	"assignee_id" varchar(32),
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"milestone" varchar(64),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	"color" varchar(16) DEFAULT '#787670' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"due_date" bigint NOT NULL,
	"status" varchar(8) DEFAULT 'open' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"open_issues" integer DEFAULT 0 NOT NULL,
	"closed_issues" integer DEFAULT 0 NOT NULL,
	"total_issues" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"user_id" varchar(32) NOT NULL,
	"type" varchar(16) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"actor_id" varchar(32),
	"target_type" varchar(16),
	"target_id" varchar(32),
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"commit_sha" varchar(40) NOT NULL,
	"commit_message" text NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"trigger" varchar(16) DEFAULT 'push' NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"branch" varchar(64) NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"repo_id" varchar(32) NOT NULL,
	"number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"source_branch" varchar(64) NOT NULL,
	"target_branch" varchar(64) NOT NULL,
	"additions" integer DEFAULT 0 NOT NULL,
	"deletions" integer DEFAULT 0 NOT NULL,
	"changed_files" integer DEFAULT 0 NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"language" varchar(32) DEFAULT '' NOT NULL,
	"language_color" varchar(16) DEFAULT '#787670' NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"default_branch" varchar(64) DEFAULT 'main' NOT NULL,
	"owner_id" varchar(32) NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"team_id" varchar(32) NOT NULL,
	"user_id" varchar(32) NOT NULL,
	"role" varchar(16) DEFAULT 'member' NOT NULL,
	"joined_at" bigint NOT NULL,
	CONSTRAINT "team_members_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"owner_id" varchar(32) NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"avatar" text,
	"role" varchar(16) DEFAULT 'member' NOT NULL,
	"github_token" varchar(128),
	"github_username" varchar(64),
	"created_at" bigint NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commits" ADD CONSTRAINT "commits_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commits" ADD CONSTRAINT "commits_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_doc_id_documents_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_doc_id_documents_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_trees" ADD CONSTRAINT "file_trees_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repos" ADD CONSTRAINT "repos_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_repo_idx" ON "activities" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "activities_created_idx" ON "activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "comments_target_idx" ON "comments" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "commits_repo_idx" ON "commits" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "discussions_repo_idx" ON "discussions" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "doccom_doc_idx" ON "document_comments" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "docver_doc_idx" ON "document_versions" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "docver_created_idx" ON "document_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "docs_team_idx" ON "documents" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "docs_updated_idx" ON "documents" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "ic_team_idx" ON "invite_codes" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "ic_code_idx" ON "invite_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "issues_repo_idx" ON "issues" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "labels_repo_idx" ON "labels" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "milestones_repo_idx" ON "milestones" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "pipelines_repo_idx" ON "pipelines" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "prs_repo_idx" ON "pull_requests" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "prs_status_idx" ON "pull_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tm_user_idx" ON "team_members" USING btree ("user_id");