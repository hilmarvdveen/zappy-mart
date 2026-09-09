import { graphql, type ResultOf } from "./graphql";

export const moneyFields = graphql(`
  fragment MoneyFields on Money {
    amount
    currency
  }
`);

export const userErrorFields = graphql(`
  fragment UserErrorFields on UserError {
    code
    message
    field
  }
`);

export const productSummaryFields = graphql(
  `
    fragment ProductSummaryFields on Product {
      id
      name
      slug
      stock
      price {
        ...MoneyFields
      }
      category {
        id
        name
        slug
      }
    }
  `,
  [moneyFields],
);

export const cartFields = graphql(
  `
    fragment CartFields on Cart {
      id
      updatedAt
      lines {
        id
        quantity
        product {
          ...ProductSummaryFields
        }
        lineTotal {
          ...MoneyFields
        }
      }
      promotion {
        code
        kind
        discount {
          ...MoneyFields
        }
      }
      subtotal {
        ...MoneyFields
      }
      shipping {
        ...MoneyFields
      }
      total {
        ...MoneyFields
      }
    }
  `,
  [productSummaryFields, moneyFields],
);

export const orderFields = graphql(
  `
    fragment OrderFields on Order {
      id
      number
      status
      placedAt
      promotionCode
      lines {
        productName
        quantity
        unitPrice {
          ...MoneyFields
        }
        lineTotal {
          ...MoneyFields
        }
      }
      subtotal {
        ...MoneyFields
      }
      discount {
        ...MoneyFields
      }
      shipping {
        ...MoneyFields
      }
      total {
        ...MoneyFields
      }
    }
  `,
  [moneyFields],
);

export const sessionFields = graphql(`
  fragment SessionFields on Session {
    id
    device
    createdAt
    lastUsedAt
    current
  }
`);

export const shellQuery = graphql(`
  query Shell {
    cart {
      lines {
        quantity
      }
    }
    wishlist {
      id
    }
    me {
      id
      name
    }
  }
`);

export const catalogueQuery = graphql(
  `
    query Catalogue($filter: ProductFilter, $first: Int!, $after: String) {
      categories {
        id
        name
        slug
      }
      products(filter: $filter, first: $first, after: $after) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          cursor
          node {
            ...ProductSummaryFields
          }
        }
      }
    }
  `,
  [productSummaryFields],
);

export const productPageQuery = graphql(
  `
    query ProductPage($slug: String!) {
      product(slug: $slug) {
        ...ProductSummaryFields
        description
      }
    }
  `,
  [productSummaryFields],
);

export const cartQuery = graphql(
  `
    query CartPage {
      cart {
        ...CartFields
      }
    }
  `,
  [cartFields],
);

export const addToCartMutation = graphql(
  `
    mutation AddToCart($productId: ID!, $quantity: Int!) {
      addToCart(productId: $productId, quantity: $quantity) {
        cart {
          ...CartFields
        }
        availableStock
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const changeCartLineQuantityMutation = graphql(
  `
    mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {
      changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {
        cart {
          ...CartFields
        }
        availableStock
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const removeCartLineMutation = graphql(
  `
    mutation RemoveCartLine($lineId: ID!) {
      removeCartLine(lineId: $lineId) {
        cart {
          ...CartFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const applyPromotionCodeMutation = graphql(
  `
    mutation ApplyPromotionCode($code: String!) {
      applyPromotionCode(code: $code) {
        cart {
          ...CartFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const removePromotionCodeMutation = graphql(
  `
    mutation RemovePromotionCode {
      removePromotionCode {
        cart {
          ...CartFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const placeOrderMutation = graphql(
  `
    mutation PlaceOrder($idempotencyKey: String!) {
      placeOrder(idempotencyKey: $idempotencyKey) {
        order {
          ...OrderFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [orderFields, userErrorFields],
);

export const orderQuery = graphql(
  `
    query OrderPage($id: ID!) {
      order(id: $id) {
        ...OrderFields
      }
    }
  `,
  [orderFields],
);

export const accountQuery = graphql(
  `
    query Account($first: Int!) {
      me {
        id
        name
        email
        createdAt
        sessions {
          ...SessionFields
        }
      }
      orders(first: $first) {
        totalCount
        edges {
          node {
            ...OrderFields
          }
        }
      }
    }
  `,
  [sessionFields, orderFields],
);

export const revokeSessionMutation = graphql(
  `
    mutation RevokeSession($sessionId: ID!) {
      revokeSession(sessionId: $sessionId) {
        sessions {
          ...SessionFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [sessionFields, userErrorFields],
);

export const registerMutation = graphql(
  `
    mutation Register($input: RegisterInput!) {
      register(input: $input) {
        customer {
          id
          name
        }
        accessToken
        accessTokenExpiresAt
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const loginMutation = graphql(
  `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        customer {
          id
          name
        }
        accessToken
        accessTokenExpiresAt
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const refreshSessionMutation = graphql(
  `
    mutation RefreshSession {
      refreshSession {
        customer {
          id
          name
        }
        accessToken
        accessTokenExpiresAt
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const logoutMutation = graphql(`
  mutation Logout {
    logout {
      success
    }
  }
`);

export const wishlistQuery = graphql(
  `
    query Wishlist {
      wishlist {
        ...ProductSummaryFields
      }
    }
  `,
  [productSummaryFields],
);

export const addToWishlistMutation = graphql(
  `
    mutation AddToWishlist($productId: ID!) {
      addToWishlist(productId: $productId) {
        products {
          id
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const removeFromWishlistMutation = graphql(
  `
    mutation RemoveFromWishlist($productId: ID!) {
      removeFromWishlist(productId: $productId) {
        products {
          id
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export type Money = ResultOf<typeof moneyFields>;
export type UserError = ResultOf<typeof userErrorFields>;
export type ProductSummary = ResultOf<typeof productSummaryFields>;
export type Cart = ResultOf<typeof cartFields>;
export type Order = ResultOf<typeof orderFields>;
export type Session = ResultOf<typeof sessionFields>;
