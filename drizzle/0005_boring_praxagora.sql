-- Any row still carrying both owners is left over from the merge bug this
-- constraint exists to prevent. An owned cart loses its session token; the
-- items stay with the user.
UPDATE carts SET session_token = NULL WHERE user_id IS NOT NULL;--> statement-breakpoint

ALTER TABLE "carts" ADD CONSTRAINT "carts_owner_exclusive" CHECK (("carts"."user_id" is null) <> ("carts"."session_token" is null));
