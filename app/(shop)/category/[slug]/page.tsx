import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategoryBySlug,
  getProductsInCategory,
} from "@/lib/db/queries/catalog";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await getProductsInCategory(category.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-medium text-ink-900">
            {category.name}
          </li>
        </ol>
      </nav>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {category.name}
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>

      {products.length === 0 ? (
        <p className="mt-10 text-ink-600">
          Nothing here yet.{" "}
          <Link href="/" className="text-link underline">
            Browse other categories
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
