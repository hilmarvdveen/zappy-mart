import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/AddToCartForm";
import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { ProductImage } from "@/components/ProductImage";
import { WishlistButton } from "@/components/WishlistButton";
import { formatMoney } from "@/formatting/money";
import { readSignedInCustomer } from "@/server/account";
import { readProduct } from "@/server/catalogue";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const answer = await readProduct(slug);
  return { title: answer?.product?.name ?? "Product" };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [answer, customer] = await Promise.all([
    readProduct(slug),
    readSignedInCustomer(),
  ]);

  if (answer === null) {
    return <ApiUnavailableNotice subject="This product" />;
  }

  const product = answer.product;
  if (product === null) {
    notFound();
  }

  const saved = (customer?.wishlist ?? []).some(
    (entry) => entry.id === product.id,
  );

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div className="flex justify-center">
        <ProductImage imageUrl={product.imageUrl} size={320} />
      </div>
      <div>
        <p className="text-sm text-slate-600">
          <Link
            href={`/?category=${product.category.slug}`}
            className="hover:underline"
          >
            {product.category.name}
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {product.name}
        </h1>
        <p className="mt-3 text-xl font-semibold text-slate-900">
          {formatMoney(product.price)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {product.stock === 0
            ? "Out of stock, and still here to read about."
            : `${product.stock} in stock`}
        </p>
        <p className="mt-4 text-slate-700">{product.description}</p>
        <AddToCartForm
          productId={product.id}
          stock={product.stock}
          withQuantity
        />
        <div className="mt-3">
          <WishlistButton productId={product.id} saved={saved} />
        </div>
      </div>
    </article>
  );
}
