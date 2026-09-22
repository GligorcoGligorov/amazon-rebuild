import { getCategories } from "@/lib/db/queries/categories";

// Read live on every request. Catalog caching is an M2 decision, once there is
// a catalog worth caching.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Shop by category
      </h1>
      <p className="mt-2 text-ink-600">
        {categories.length} categories, read live from the database.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.id}>
            <div className="rounded-lg border border-border bg-surface-sunken p-5">
              <h2 className="font-medium">{category.name}</h2>
              <p className="mt-1 text-sm text-ink-600">
                /{category.slug}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
