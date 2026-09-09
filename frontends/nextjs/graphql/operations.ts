import { graphql } from "@/graphql/generated";

export const productSummaryFragment = graphql(`
  fragment ProductSummary on Product {
    id
    name
    slug
    stock
    imageUrl
    price {
      amount
      currency
    }
    category {
      id
      name
      slug
    }
  }
`);

export const productDetailFragment = graphql(`
  fragment ProductDetail on Product {
    ...ProductSummary
    description
  }
`);

export const cartDetailFragment = graphql(`
  fragment CartDetail on Cart {
    id
    updatedAt
    subtotal {
      amount
      currency
    }
    shipping {
      amount
      currency
    }
    total {
      amount
      currency
    }
    promotion {
      code
      kind
      discount {
        amount
        currency
      }
    }
    lines {
      id
      quantity
      lineTotal {
        amount
        currency
      }
      product {
        ...ProductSummary
      }
    }
  }
`);

export const orderDetailFragment = graphql(`
  fragment OrderDetail on Order {
    id
    number
    status
    promotionCode
    placedAt
    subtotal {
      amount
      currency
    }
    discount {
      amount
      currency
    }
    shipping {
      amount
      currency
    }
    total {
      amount
      currency
    }
    lines {
      productName
      quantity
      unitPrice {
        amount
        currency
      }
      lineTotal {
        amount
        currency
      }
    }
  }
`);

export const userErrorFragment = graphql(`
  fragment UserErrorDetail on UserError {
    code
    message
    field
  }
`);

export const categoriesQuery = graphql(`
  query Categories {
    categories {
      id
      name
      slug
    }
  }
`);

export const catalogueQuery = graphql(`
  query Catalogue($filter: ProductFilter, $first: Int, $after: String) {
    products(filter: $filter, first: $first, after: $after) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          ...ProductSummary
        }
      }
    }
  }
`);

export const productBySlugQuery = graphql(`
  query ProductBySlug($slug: String!) {
    product(slug: $slug) {
      ...ProductDetail
    }
  }
`);

export const cartQuery = graphql(`
  query CartContents {
    cart {
      ...CartDetail
    }
  }
`);

export const signedInCustomerQuery = graphql(`
  query SignedInCustomer {
    me {
      id
      name
      email
    }
    wishlist {
      id
    }
  }
`);

export const accountQuery = graphql(`
  query Account {
    me {
      id
      name
      email
      createdAt
      sessions {
        id
        device
        createdAt
        lastUsedAt
        current
      }
      wishlist {
        ...ProductSummary
      }
    }
  }
`);

export const wishlistQuery = graphql(`
  query Wishlist {
    wishlist {
      ...ProductSummary
    }
  }
`);

export const orderHistoryQuery = graphql(`
  query OrderHistory($first: Int, $after: String) {
    orders(first: $first, after: $after) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          ...OrderDetail
        }
      }
    }
  }
`);

export const orderByIdQuery = graphql(`
  query OrderById($id: ID!) {
    order(id: $id) {
      ...OrderDetail
    }
  }
`);

export const addToCartMutation = graphql(`
  mutation AddToCart($productId: ID!, $quantity: Int) {
    addToCart(productId: $productId, quantity: $quantity) {
      availableStock
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const changeCartLineQuantityMutation = graphql(`
  mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {
    changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {
      availableStock
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const removeCartLineMutation = graphql(`
  mutation RemoveCartLine($lineId: ID!) {
    removeCartLine(lineId: $lineId) {
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const applyPromotionCodeMutation = graphql(`
  mutation ApplyPromotionCode($code: String!) {
    applyPromotionCode(code: $code) {
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const removePromotionCodeMutation = graphql(`
  mutation RemovePromotionCode {
    removePromotionCode {
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const placeOrderMutation = graphql(`
  mutation PlaceOrder($idempotencyKey: String) {
    placeOrder(idempotencyKey: $idempotencyKey) {
      order {
        ...OrderDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const registerMutation = graphql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      accessTokenExpiresAt
      customer {
        id
        name
        email
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const loginMutation = graphql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      accessTokenExpiresAt
      customer {
        id
        name
        email
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const refreshSessionMutation = graphql(`
  mutation RefreshSession {
    refreshSession {
      accessToken
      accessTokenExpiresAt
      customer {
        id
        name
        email
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const logoutMutation = graphql(`
  mutation Logout {
    logout {
      success
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const revokeSessionMutation = graphql(`
  mutation RevokeSession($sessionId: ID!) {
    revokeSession(sessionId: $sessionId) {
      sessions {
        id
        device
        createdAt
        lastUsedAt
        current
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const addToWishlistMutation = graphql(`
  mutation AddToWishlist($productId: ID!) {
    addToWishlist(productId: $productId) {
      products {
        ...ProductSummary
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const removeFromWishlistMutation = graphql(`
  mutation RemoveFromWishlist($productId: ID!) {
    removeFromWishlist(productId: $productId) {
      products {
        ...ProductSummary
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);
