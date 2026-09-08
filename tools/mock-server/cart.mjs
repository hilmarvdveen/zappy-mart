import { randomUUID } from "node:crypto";
import { money, userError } from "./state.mjs";
import { findProductById, presentProduct } from "./catalogue.mjs";
import { calculateDiscount, checkPromotionCode, findPromotionCode, givesFreeShipping } from "./promotions.mjs";

export const shippingCharge = 495;
export const freeShippingFromSubtotal = 5000;

export function findCartForVisitor(store, visitor) {
  if (visitor.customerId !== null) {
    return store.carts.find((cart) => cart.customerId === visitor.customerId) ?? null;
  }
  if (visitor.anonymousCartId !== null) {
    return store.carts.find((cart) => cart.id === visitor.anonymousCartId && cart.customerId === null) ?? null;
  }
  return null;
}

export function createCart(customerId, now) {
  return {
    id: `cart-${randomUUID()}`,
    customerId,
    lines: [],
    promotionCode: null,
    updatedAt: now
  };
}

export function openCartForVisitor(store, visitor, now) {
  const existingCart = findCartForVisitor(store, visitor);
  if (existingCart !== null) {
    return existingCart;
  }
  const cart = createCart(visitor.customerId, now);
  store.carts.push(cart);
  return cart;
}

export function calculateLineTotal(store, line) {
  const product = findProductById(store, line.productId);
  return product.price.amount * line.quantity;
}

export function calculateAmounts(store, cart) {
  const subtotal = cart.lines.reduce((runningTotal, line) => runningTotal + calculateLineTotal(store, line), 0);
  const promotionCode = cart.promotionCode === null ? null : findPromotionCode(store, cart.promotionCode);
  const discount = promotionCode === null ? 0 : calculateDiscount(promotionCode, subtotal);
  const shippingIsFree =
    cart.lines.length === 0 ||
    subtotal >= freeShippingFromSubtotal ||
    (promotionCode !== null && givesFreeShipping(promotionCode));
  const shipping = shippingIsFree ? 0 : shippingCharge;

  return { promotionCode, subtotal, discount, shipping, total: subtotal + shipping - discount };
}

export function presentCart(store, cart) {
  const amounts = calculateAmounts(store, cart);

  return {
    id: cart.id,
    lines: cart.lines.map((line) => ({
      id: line.id,
      product: presentProduct(store, findProductById(store, line.productId)),
      quantity: line.quantity,
      lineTotal: money(calculateLineTotal(store, line))
    })),
    promotion:
      amounts.promotionCode === null
        ? null
        : {
            code: amounts.promotionCode.code,
            kind: amounts.promotionCode.kind,
            discount: money(amounts.discount)
          },
    subtotal: money(amounts.subtotal),
    shipping: money(amounts.shipping),
    total: money(amounts.total),
    updatedAt: cart.updatedAt
  };
}

export function addProductToCart(store, cart, productId, quantity, now) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { errors: [userError("QUANTITY_INVALID", "A quantity has to be a whole number of one or more.", "quantity")] };
  }

  const product = findProductById(store, productId);
  if (product === null) {
    return { errors: [userError("PRODUCT_NOT_FOUND", "No product with that id exists.", "productId")] };
  }

  const existingLine = cart.lines.find((line) => line.productId === productId) ?? null;
  const wantedQuantity = (existingLine === null ? 0 : existingLine.quantity) + quantity;
  if (wantedQuantity > product.stock) {
    return {
      availableStock: product.stock,
      errors: [
        userError("OUT_OF_STOCK", `Only ${product.stock} of this product are available.`, "quantity")
      ]
    };
  }

  if (existingLine === null) {
    cart.lines.push({ id: `line-${randomUUID()}`, productId, quantity });
  } else {
    existingLine.quantity = wantedQuantity;
  }
  cart.updatedAt = now;

  return { errors: [] };
}

export function changeCartLineQuantity(store, cart, lineId, quantity, now) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      errors: [
        userError(
          "QUANTITY_INVALID",
          "A quantity has to be a whole number of one or more. Remove the line to take the product out of the cart.",
          "quantity"
        )
      ]
    };
  }

  const line = cart.lines.find((candidate) => candidate.id === lineId) ?? null;
  if (line === null) {
    return { errors: [userError("CART_LINE_NOT_FOUND", "No line with that id is in this cart.", "lineId")] };
  }

  const product = findProductById(store, line.productId);
  if (quantity > product.stock) {
    return {
      availableStock: product.stock,
      errors: [userError("OUT_OF_STOCK", `Only ${product.stock} of this product are available.`, "quantity")]
    };
  }

  line.quantity = quantity;
  cart.updatedAt = now;

  return { errors: [] };
}

export function removeCartLine(store, cart, lineId, now) {
  const position = cart.lines.findIndex((line) => line.id === lineId);
  if (position === -1) {
    return { errors: [userError("CART_LINE_NOT_FOUND", "No line with that id is in this cart.", "lineId")] };
  }

  cart.lines.splice(position, 1);
  cart.updatedAt = now;

  return { errors: [] };
}

export function applyPromotionCodeToCart(store, cart, code, now) {
  const subtotal = calculateAmounts(store, cart).subtotal;
  const outcome = checkPromotionCode(store, code, subtotal, now);
  if (outcome.error !== null) {
    return { errors: [outcome.error] };
  }

  cart.promotionCode = outcome.promotionCode.code;
  cart.updatedAt = now;

  return { errors: [] };
}

export function removePromotionCodeFromCart(store, cart, now) {
  if (cart.promotionCode !== null) {
    cart.promotionCode = null;
    cart.updatedAt = now;
  }
  return { errors: [] };
}

export function emptyCart(cart, now) {
  cart.lines = [];
  cart.promotionCode = null;
  cart.updatedAt = now;
}

export function mergeAnonymousCartIntoCustomer(store, anonymousCartId, customerId, now) {
  if (anonymousCartId === null) {
    return;
  }

  const anonymousCart =
    store.carts.find((cart) => cart.id === anonymousCartId && cart.customerId === null) ?? null;
  if (anonymousCart === null) {
    return;
  }

  const customerCart = store.carts.find((cart) => cart.customerId === customerId) ?? null;
  if (customerCart === null) {
    anonymousCart.customerId = customerId;
    anonymousCart.updatedAt = now;
    return;
  }

  for (const line of anonymousCart.lines) {
    const product = findProductById(store, line.productId);
    if (product === null || product.stock < 1) {
      continue;
    }
    const existingLine = customerCart.lines.find((candidate) => candidate.productId === line.productId) ?? null;
    if (existingLine === null) {
      customerCart.lines.push({
        id: `line-${randomUUID()}`,
        productId: line.productId,
        quantity: Math.min(line.quantity, product.stock)
      });
    } else {
      existingLine.quantity = Math.min(existingLine.quantity + line.quantity, product.stock);
    }
  }

  if (customerCart.promotionCode === null) {
    customerCart.promotionCode = anonymousCart.promotionCode;
  }
  customerCart.updatedAt = now;
  store.carts = store.carts.filter((cart) => cart !== anonymousCart);
}

function answerWithCart(context, change) {
  const cart = openCartForVisitor(context.store, context.visitor, context.now);
  context.rememberCart(cart);
  const outcome = change(cart);

  return {
    cart: presentCart(context.store, cart),
    availableStock: outcome.availableStock ?? null,
    errors: outcome.errors
  };
}

export const cartResolvers = {
  Query: {
    cart(parent, argumentValues, context) {
      const cart = findCartForVisitor(context.store, context.visitor);
      return presentCart(context.store, cart ?? createCart(context.visitor.customerId, context.now));
    }
  },

  Mutation: {
    addToCart(parent, { productId, quantity }, context) {
      return answerWithCart(context, (cart) =>
        addProductToCart(context.store, cart, productId, quantity ?? 1, context.now)
      );
    },

    changeCartLineQuantity(parent, { lineId, quantity }, context) {
      return answerWithCart(context, (cart) =>
        changeCartLineQuantity(context.store, cart, lineId, quantity, context.now)
      );
    },

    removeCartLine(parent, { lineId }, context) {
      return answerWithCart(context, (cart) => removeCartLine(context.store, cart, lineId, context.now));
    },

    applyPromotionCode(parent, { code }, context) {
      return answerWithCart(context, (cart) => applyPromotionCodeToCart(context.store, cart, code, context.now));
    },

    removePromotionCode(parent, argumentValues, context) {
      return answerWithCart(context, (cart) => removePromotionCodeFromCart(context.store, cart, context.now));
    }
  }
};
