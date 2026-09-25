import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategories,
  getCategoryBySlug,
  getProductsInCategory,
} from "@/lib/db/queries/catalog";
import { ProductCard } from "@/components/product-card";
import { buttonClass } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [category, all] = await Promise.all([getCategoryBySlug(slug), getCategories()]);
  if (!category) notFound();

  const products = await getProductsInCategory(category.id);
  // The department's place in the home page index, so the two agree.
  const position = all.findIndex((c) => c.id === category.id) + 1;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="eyebrow">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li>
            <Link href="/" className="hover:text-ink-900 hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink-900">
            {category.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-ink-900 pb-5 sm:mt-10">
        <div>
          <p className="eyebrow">
            Department {pad(position)} of {pad(all.length)}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-none sm:text-7xl">{category.name}</h1>
        </div>
        <div className="flex items-center gap-5">
          <p className="font-mono text-sm text-ink-600">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
          <Link
            href={`/search?category=${category.slug}`}
            className={buttonClass({ variant: "quiet", className: "min-h-11 text-sm" })}
          >
            Sort and search
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 text-ink-600">
          Nothing here yet.{" "}
          <Link href="/" className="underline underline-offset-4">
            Browse other categories
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
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
