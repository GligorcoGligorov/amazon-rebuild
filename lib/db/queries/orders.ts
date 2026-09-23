import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { addresses, orderItems, orders, type Address, type Order } from "../schema";

export async function getAddresses(userId: string): Promise<Address[]> {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.createdAt));
}

/** Scoped to the owner, so an id from elsewhere resolves to nothing. */
export async function getAddress(
  userId: string,
  addressId: string,
): Promise<Address | null> {
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .limit(1);
  return row ?? null;
}

export type OrderLine = {
  id: string;
  productSlug: string;
  productTitle: string;
  variantName: string | null;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type OrderSummary = Order & { items: OrderLine[]; itemCount: number };

export async function getOrders(userId: string): Promise<OrderSummary[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt));
  if (rows.length === 0) return [];

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, rows[0].id));

  // One extra round trip per order is fine at this scale; the list is short.
  const byOrder = new Map<string, OrderLine[]>();
  byOrder.set(rows[0].id, items.map(toLine));

  for (const order of rows.slice(1)) {
    const more = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    byOrder.set(order.id, more.map(toLine));
  }

  return rows.map((order) => {
    const lines = byOrder.get(order.id) ?? [];
    return {
      ...order,
      items: lines,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    };
  });
}

export async function getOrder(
  userId: string,
  orderId: string,
): Promise<OrderSummary | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return null;

  const lines = (
    await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
  ).map(toLine);

  return {
    ...order,
    items: lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
  };
}

function toLine(row: typeof orderItems.$inferSelect): OrderLine {
  return {
    id: row.id,
    productSlug: row.productSlug,
    productTitle: row.productTitle,
    variantName: row.variantName,
    imageUrl: row.imageUrl,
    unitPriceCents: row.unitPriceCents,
    quantity: row.quantity,
    lineTotalCents: row.unitPriceCents * row.quantity,
  };
}
