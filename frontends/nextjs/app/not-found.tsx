import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFoundPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        That page is not in this store
      </h1>
      <p className="mt-2 text-slate-700">
        The catalogue holds twenty products.{" "}
        <Link href="/" className="underline">
          Start there
        </Link>
        .
      </p>
    </div>
  );
}
