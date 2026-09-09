import type {
  AccountQuery,
  CartDetailFragment,
  OrderDetailFragment,
  ProductDetailFragment,
  ProductSummaryFragment,
} from "@/graphql/generated/graphql";

const menswear = {
  id: "category-mens-clothing",
  name: "Men's clothing",
  slug: "mens-clothing",
};

export const backpack: ProductSummaryFragment = {
  id: "product-01",
  name: "Fjallraven Foldsack No. 1 Backpack, Fits 15 Laptops",
  slug: "fjallraven-foldsack-no-1-backpack",
  stock: 12,
  imageUrl: "/images/products/fjallraven-foldsack-no-1-backpack.svg",
  price: { amount: 10995, currency: "EUR" },
  category: menswear,
};

export const cottonJacket: ProductDetailFragment = {
  id: "product-03",
  name: "Mens Cotton Jacket",
  slug: "mens-cotton-jacket",
  description: "Great outerwear jackets for spring, autumn and winter.",
  stock: 8,
  imageUrl: "/images/products/mens-cotton-jacket.svg",
  price: { amount: 5599, currency: "EUR" },
  category: menswear,
};

export const princessRing: ProductSummaryFragment = {
  id: "product-07",
  name: "White Gold Plated Princess",
  slug: "white-gold-plated-princess",
  stock: 0,
  imageUrl: "/images/products/white-gold-plated-princess.svg",
  price: { amount: 999, currency: "EUR" },
  category: { id: "category-jewellery", name: "Jewellery", slug: "jewellery" },
};

export const filledCart: CartDetailFragment = {
  id: "cart-1",
  updatedAt: "2026-09-09T10:00:00Z",
  subtotal: { amount: 10995, currency: "EUR" },
  shipping: { amount: 0, currency: "EUR" },
  total: { amount: 10995, currency: "EUR" },
  promotion: null,
  lines: [
    {
      id: "line-1",
      quantity: 1,
      lineTotal: { amount: 10995, currency: "EUR" },
      product: backpack,
    },
  ],
};

export const emptyCart: CartDetailFragment = {
  ...filledCart,
  subtotal: { amount: 0, currency: "EUR" },
  shipping: { amount: 495, currency: "EUR" },
  total: { amount: 495, currency: "EUR" },
  lines: [],
};

export const placedOrder: OrderDetailFragment = {
  id: "order-1",
  number: "ZM-1001",
  status: "PAID",
  promotionCode: "WELCOME10",
  placedAt: "2026-09-09T10:05:00Z",
  subtotal: { amount: 10995, currency: "EUR" },
  discount: { amount: 1100, currency: "EUR" },
  shipping: { amount: 0, currency: "EUR" },
  total: { amount: 9895, currency: "EUR" },
  lines: [
    {
      productName: backpack.name,
      quantity: 1,
      unitPrice: { amount: 10995, currency: "EUR" },
      lineTotal: { amount: 10995, currency: "EUR" },
    },
  ],
};

export const signedInCustomer: NonNullable<AccountQuery["me"]> = {
  id: "customer-01",
  name: "Jane Doe",
  email: "jane@example.com",
  createdAt: "2026-01-15T09:00:00Z",
  sessions: [
    {
      id: "session-1",
      device: "Chrome on Windows",
      createdAt: "2026-09-09T09:00:00Z",
      lastUsedAt: "2026-09-09T10:00:00Z",
      current: true,
    },
    {
      id: "session-2",
      device: "Safari on iPhone",
      createdAt: "2026-09-01T09:00:00Z",
      lastUsedAt: "2026-09-02T09:00:00Z",
      current: false,
    },
  ],
  wishlist: [backpack],
};
