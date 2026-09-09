import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { OrderSummary } from "@/components/OrderSummary";
import { readOrder } from "@/server/ordering";

export const metadata: Metadata = {
  title: "Your order",
};

export default async function OrderConfirmationPage({
  params,
}: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  const answer = await readOrder(orderId);

  if (answer === null) {
    return <ApiUnavailableNotice subject="This order" />;
  }

  const order = answer.order;
  if (order === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Thank you for your order
      </h1>
      <p className="mt-1 text-slate-700">
        Keep the order number. It is what the confirmation mail carries as well.
      </p>
      <div className="mt-6">
        <OrderSummary order={order} />
      </div>
      <div className="mt-6 flex gap-4">
        <Link href="/" className="underline">
          Back to the catalogue
        </Link>
        <Link href="/account" className="underline">
          Your order history
        </Link>
      </div>
    </div>
  );
}
