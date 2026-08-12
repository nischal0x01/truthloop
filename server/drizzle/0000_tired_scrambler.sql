-- uuid-ossp is required by gen_random_uuid() defaults below. Aiven's
-- hosted Postgres does not have this extension enabled by default —
-- without this line, 0000 fails on every CREATE TABLE with
-- "function gen_random_uuid() does not exist".
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";--> statement-breakpoint
CREATE TYPE "public"."ai_verdict" AS ENUM('real', 'fake', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."forecast_status" AS ENUM('success', 'fallback', 'failed');--> statement-breakpoint
CREATE TYPE "public"."forecast_vote" AS ENUM('believe', 'doubt', 'skip');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('new_claim', 'reply_to_comment', 'new_scam_forecast', 'weekly_report_ready', 'badge_earned', 'leaderboard_rank_up');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('real', 'fake');--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email_digest_enabled" boolean DEFAULT true NOT NULL,
	"email_instant_alerts_enabled" boolean DEFAULT true NOT NULL,
	"email_digest_hour_local" integer DEFAULT 8 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"google_id" text,
	"password_hash" text,
	"points" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"is_admin" boolean DEFAULT false NOT NULL,
	"email_bounced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"verdict" "verdict" NOT NULL,
	"category" text NOT NULL,
	"explanation" text NOT NULL,
	"source_url" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"trending_score" real DEFAULT 0 NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"user_answer" "verdict" NOT NULL,
	"is_correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_votes" (
	"user_id" uuid NOT NULL,
	"comment_id" uuid NOT NULL,
	"vote" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_votes_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id"),
	CONSTRAINT "comment_votes_range" CHECK ("comment_votes"."vote" IN (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"body" text NOT NULL,
	"toxicity_score" real,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "comments_body_length" CHECK (char_length("comments"."body") <= 2000 AND char_length("comments"."body") > 0)
);
--> statement-breakpoint
CREATE TABLE "discussion_comment_votes" (
	"user_id" uuid NOT NULL,
	"comment_id" uuid NOT NULL,
	"vote" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_comment_votes_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id"),
	CONSTRAINT "discussion_comment_votes_range" CHECK ("discussion_comment_votes"."vote" IN (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "discussion_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"body" text NOT NULL,
	"toxicity_score" real,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_comments_body_length" CHECK (char_length("discussion_comments"."body") <= 2000 AND char_length("discussion_comments"."body") > 0)
);
--> statement-breakpoint
CREATE TABLE "discussion_votes" (
	"user_id" uuid NOT NULL,
	"discussion_id" uuid NOT NULL,
	"vote" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_votes_user_id_discussion_id_pk" PRIMARY KEY("user_id","discussion_id"),
	CONSTRAINT "discussion_votes_range" CHECK ("discussion_votes"."vote" IN (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "discussions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussions_title_length" CHECK (char_length("discussions"."title") <= 300 AND char_length("discussions"."title") > 0),
	CONSTRAINT "discussions_body_length" CHECK (char_length("discussions"."body") <= 2000 AND char_length("discussions"."body") > 0)
);
--> statement-breakpoint
CREATE TABLE "user_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"ai_verdict" "ai_verdict",
	"ai_confidence" smallint,
	"ai_explanation" text,
	"ai_sources" jsonb,
	"ai_category" text,
	"is_toxic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_text_length" CHECK (char_length("user_submissions"."text") > 0 AND char_length("user_submissions"."text") <= 1000),
	CONSTRAINT "submissions_confidence_range" CHECK ("user_submissions"."ai_confidence" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "forecast_votes" (
	"user_id" uuid NOT NULL,
	"forecast_item_id" uuid NOT NULL,
	"vote" "forecast_vote" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forecast_votes_user_id_forecast_item_id_pk" PRIMARY KEY("user_id","forecast_item_id")
);
--> statement-breakpoint
CREATE TABLE "scam_forecast_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"forecast_id" uuid NOT NULL,
	"severity" "severity" NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"recommended_action" text,
	"believe_count" integer DEFAULT 0 NOT NULL,
	"doubt_count" integer DEFAULT 0 NOT NULL,
	"skip_count" integer DEFAULT 0 NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_was_accurate" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scam_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"forecast_date" date NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generation_status" "forecast_status" DEFAULT 'success' NOT NULL,
	CONSTRAINT "scam_forecasts_forecast_date_unique" UNIQUE("forecast_date")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"rarity" "rarity" DEFAULT 'common' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_slug" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_slug_pk" PRIMARY KEY("user_id","badge_slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_starting" date NOT NULL,
	"total_guesses" integer DEFAULT 0 NOT NULL,
	"correct_guesses" integer DEFAULT 0 NOT NULL,
	"blind_spot_category" text,
	"blind_spot_narrative" text,
	"replay_claim_id" uuid,
	"global_average_accuracy" real,
	"user_accuracy" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment_votes" ADD CONSTRAINT "discussion_comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment_votes" ADD CONSTRAINT "discussion_comment_votes_comment_id_discussion_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."discussion_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_discussion_id_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_parent_comment_id_discussion_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."discussion_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_discussion_id_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_submissions" ADD CONSTRAINT "user_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_votes" ADD CONSTRAINT "forecast_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_votes" ADD CONSTRAINT "forecast_votes_forecast_item_id_scam_forecast_items_id_fk" FOREIGN KEY ("forecast_item_id") REFERENCES "public"."scam_forecast_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scam_forecast_items" ADD CONSTRAINT "scam_forecast_items_forecast_id_scam_forecasts_id_fk" FOREIGN KEY ("forecast_id") REFERENCES "public"."scam_forecasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_slug_badges_slug_fk" FOREIGN KEY ("badge_slug") REFERENCES "public"."badges"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_replay_claim_id_claims_id_fk" FOREIGN KEY ("replay_claim_id") REFERENCES "public"."claims"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_points" ON "users" USING btree ("points" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_users_google_id" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "idx_claims_published_trending" ON "claims" USING btree ("is_published","trending_score" DESC NULLS LAST,"published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "guesses_user_claim_unique" ON "guesses" USING btree ("user_id","claim_id");--> statement-breakpoint
CREATE INDEX "idx_guesses_user_created" ON "guesses" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_guesses_claim" ON "guesses" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "idx_comment_votes_comment" ON "comment_votes" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_comments_claim_created" ON "comments" USING btree ("claim_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_comment_id") WHERE "comments"."parent_comment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_comments_user" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_discussion_comment_votes_comment" ON "discussion_comment_votes" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_discussion_comments_discussion_created" ON "discussion_comments" USING btree ("discussion_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_discussion_comments_parent" ON "discussion_comments" USING btree ("parent_comment_id") WHERE "discussion_comments"."parent_comment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_discussion_comments_user" ON "discussion_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_discussion_votes_discussion" ON "discussion_votes" USING btree ("discussion_id");--> statement-breakpoint
CREATE INDEX "idx_discussions_user" ON "discussions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_discussions_created" ON "discussions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_submissions_user" ON "user_submissions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_forecast_items_forecast" ON "scam_forecast_items" USING btree ("forecast_id","severity");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE "notifications"."is_read" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_reports_user_week_unique" ON "weekly_reports" USING btree ("user_id","week_starting");--> statement-breakpoint
CREATE INDEX "idx_weekly_reports_user" ON "weekly_reports" USING btree ("user_id","week_starting" DESC NULLS LAST);