ALTER TABLE "discussion_comments" DROP CONSTRAINT "discussion_comments_body_length";--> statement-breakpoint
ALTER TABLE "discussions" DROP CONSTRAINT "discussions_body_length";--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_body_length" CHECK (char_length("discussion_comments"."body") <= 500000 AND char_length("discussion_comments"."body") > 0);--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_body_length" CHECK (char_length("discussions"."body") <= 500000 AND char_length("discussions"."body") > 0);