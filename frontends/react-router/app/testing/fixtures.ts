import type {
  Cart,
  Money,
  Order,
  ProductSummary,
  Session,
} from "~/graphql/documents";

export function euro(amount: number): Money {
  return { amount, currency: "EUR" };
}

export const mensClothing = {
  id: "category-mens-clothing",
  name: "Men's clothing",
  slug: "mens-clothing",
};

export const electronics = {
  id: "category-electronics",
  name: "Electronics",
  slug: "electronics",
};

export const cottonJacket: ProductSummary = {
  id: "product-03",
  name: "Mens Cotton Jacket",
  slug: "mens-cotton-jacket",
  stock: 8,
  price: euro(5599),
  category: mensClothing,
};

export const gamingDrive: ProductSummary = {
  id: "product-12",
  name: "WD 4TB Gaming Drive",
  slug: "wd-4tb-gaming-drive-playstation-4",
  stock: 1,
  price: euro(11400),
  category: electronics,
};

export const cartWithOneJacket: Cart = {
  id: "cart-01",
  updatedAt: "2026-09-09T10:00:00Z",
  lines: [
    {
      id: "line-01",
      quantity: 1,
      product: cottonJacket,
      lineTotal: euro(5599),
    },
  ],
  promotion: null,
  subtotal: euro(5599),
  shipping: euro(0),
  total: euro(5599),
};

export const emptyCart: Cart = {
  id: "cart-02",
  updatedAt: "2026-09-09T10:00:00Z",
  lines: [],
  promotion: null,
  subtotal: euro(0),
  shipping: euro(0),
  total: euro(0),
};

export const cartWithPromotion: Cart = {
  ...cartWithOneJacket,
  promotion: {
    code: "WELCOME10",
    kind: "PERCENTAGE",
    discount: euro(560),
  },
  total: euro(5039),
};

export const placedOrder: Order = {
  id: "order-01",
  number: "ZM-1001",
  status: "PAID",
  placedAt: "2026-09-09T10:05:00Z",
  promotionCode: "WELCOME10",
  lines: [
    {
      productName: "Mens Cotton Jacket",
      quantity: 1,
      unitPrice: euro(5599),
      lineTotal: euro(5599),
    },
  ],
  subtotal: euro(5599),
  discount: euro(560),
  shipping: euro(0),
  total: euro(5039),
};

export const thisDeviceSession: Session = {
  id: "session-01",
  device: "Chrome on Windows",
  createdAt: "2026-09-09T09:00:00Z",
  lastUsedAt: "2026-09-09T10:00:00Z",
  current: true,
};

export const otherDeviceSession: Session = {
  id: "session-02",
  device: "Firefox on Linux",
  createdAt: "2026-09-08T09:00:00Z",
  lastUsedAt: "2026-09-08T10:00:00Z",
  current: false,
};
