import { Link } from "react-router";
import type { ProductSummary } from "~/graphql/documents";
import { formatMoney } from "~/store/money";
import { ProductImage } from "./ProductImage";

type ProductCardProperties = {
  product: ProductSummary;
};

export function ProductCard({ product }: ProductCardProperties) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <ProductImage name={product.name} className="h-40 w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {product.category.name}
        </p>
        <h3 className="text-base font-semibold leading-snug">
          <Link
            to={`/products/${product.slug}`}
            className="text-slate-900 hover:text-emerald-700 hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-auto text-lg font-semibold text-slate-900">
          {formatMoney(product.price)}
        </p>
        <p className="text-sm text-slate-600">
          {product.stock === 0
            ? "Out of stock"
            : `${product.stock} in stock`}
        </p>
      </div>
    </article>
  );
}
