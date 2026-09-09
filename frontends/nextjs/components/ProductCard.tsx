import Link from "next/link";

import { AddToCartForm } from "@/components/AddToCartForm";
import { ProductImage } from "@/components/ProductImage";
import { WishlistButton } from "@/components/WishlistButton";
import { formatMoney } from "@/formatting/money";
import type { ProductSummaryFragment } from "@/graphql/generated/graphql";

export function ProductCard({
  product,
  saved,
}: {
  product: ProductSummaryFragment;
  saved: boolean;
}) {
  return (
    <article className="flex w-full flex-col rounded border border-slate-200 bg-white p-4">
      <div className="self-center">
        <ProductImage imageUrl={product.imageUrl} size={160} />
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">
        <Link href={`/products/${product.slug}`} className="hover:underline">
          {product.name}
        </Link>
      </h3>
      <p className="text-sm text-slate-600">{product.category.name}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">
        {formatMoney(product.price)}
      </p>
      <p className="text-sm text-slate-600">
        {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
      </p>
      <div className="mt-auto">
        <AddToCartForm productId={product.id} stock={product.stock} />
        <div className="mt-2">
          <WishlistButton productId={product.id} saved={saved} />
        </div>
      </div>
    </article>
  );
}
