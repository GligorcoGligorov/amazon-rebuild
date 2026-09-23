import { getCategories, getFeaturedProducts } from "@/lib/db/queries/catalog";
import { CategoryTile } from "@/components/category-tile";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <section aria-labelledby="categories-heading">
        <h1 id="categories-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Shop by category
        </h1>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryTile category={category} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="featured-heading" className="mt-12">
        <h2 id="featured-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
          Top rated
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
