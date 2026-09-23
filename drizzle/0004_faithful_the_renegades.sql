-- Cart ownership becomes exclusive: a cart is a guest's (session_token set,
-- user_id null) or a user's (user_id set, session_token null), never both.
--
-- The data fix in the middle is deliberate and hand-written. An earlier merge
-- bug left carts carrying BOTH a session token and a user id, which is what let
-- a signed-out visitor see the last user's cart and a new account inherit it.
-- Those rows have to be repaired before the unique constraint can hold.

ALTER TABLE "carts" ALTER COLUMN "session_token" DROP NOT NULL;--> statement-breakpoint

-- Fold every duplicate cart a user owns into their most recent one, summing
-- quantities and clamping to stock, then drop the extras.
WITH keep AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM carts
  WHERE user_id IS NOT NULL
  ORDER BY user_id, updated_at DESC, created_at DESC
)
INSERT INTO cart_items (cart_id, variant_id, quantity)
SELECT k.id, ci.variant_id, LEAST(SUM(ci.quantity), MIN(v.stock))
FROM cart_items ci
JOIN carts c ON c.id = ci.cart_id
JOIN keep k ON k.user_id = c.user_id
JOIN variants v ON v.id = ci.variant_id
WHERE c.user_id IS NOT NULL AND c.id <> k.id
GROUP BY k.id, ci.variant_id
ON CONFLICT (cart_id, variant_id)
DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, EXCLUDED.quantity + cart_items.quantity);--> statement-breakpoint

DELETE FROM carts c
USING (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM carts
  WHERE user_id IS NOT NULL
  ORDER BY user_id, updated_at DESC, created_at DESC
) k
WHERE c.user_id = k.user_id AND c.id <> k.id;--> statement-breakpoint

-- An owned cart must not also answer to a browser session.
UPDATE carts SET session_token = NULL WHERE user_id IS NOT NULL;--> statement-breakpoint

ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_unique" UNIQUE("user_id");
