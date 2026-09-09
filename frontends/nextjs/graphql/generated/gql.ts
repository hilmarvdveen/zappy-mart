/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  fragment ProductSummary on Product {\n    id\n    name\n    slug\n    stock\n    imageUrl\n    price {\n      amount\n      currency\n    }\n    category {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.ProductSummaryFragmentDoc,
    "\n  fragment ProductDetail on Product {\n    ...ProductSummary\n    description\n  }\n": typeof types.ProductDetailFragmentDoc,
    "\n  fragment CartDetail on Cart {\n    id\n    updatedAt\n    subtotal {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    promotion {\n      code\n      kind\n      discount {\n        amount\n        currency\n      }\n    }\n    lines {\n      id\n      quantity\n      lineTotal {\n        amount\n        currency\n      }\n      product {\n        ...ProductSummary\n      }\n    }\n  }\n": typeof types.CartDetailFragmentDoc,
    "\n  fragment OrderDetail on Order {\n    id\n    number\n    status\n    promotionCode\n    placedAt\n    subtotal {\n      amount\n      currency\n    }\n    discount {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    lines {\n      productName\n      quantity\n      unitPrice {\n        amount\n        currency\n      }\n      lineTotal {\n        amount\n        currency\n      }\n    }\n  }\n": typeof types.OrderDetailFragmentDoc,
    "\n  fragment UserErrorDetail on UserError {\n    code\n    message\n    field\n  }\n": typeof types.UserErrorDetailFragmentDoc,
    "\n  query Categories {\n    categories {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.CategoriesDocument,
    "\n  query Catalogue($filter: ProductFilter, $first: Int, $after: String) {\n    products(filter: $filter, first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...ProductSummary\n        }\n      }\n    }\n  }\n": typeof types.CatalogueDocument,
    "\n  query ProductBySlug($slug: String!) {\n    product(slug: $slug) {\n      ...ProductDetail\n    }\n  }\n": typeof types.ProductBySlugDocument,
    "\n  query CartContents {\n    cart {\n      ...CartDetail\n    }\n  }\n": typeof types.CartContentsDocument,
    "\n  query SignedInCustomer {\n    me {\n      id\n      name\n      email\n    }\n    wishlist {\n      id\n    }\n  }\n": typeof types.SignedInCustomerDocument,
    "\n  query Account {\n    me {\n      id\n      name\n      email\n      createdAt\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      wishlist {\n        ...ProductSummary\n      }\n    }\n  }\n": typeof types.AccountDocument,
    "\n  query Wishlist {\n    wishlist {\n      ...ProductSummary\n    }\n  }\n": typeof types.WishlistDocument,
    "\n  query OrderHistory($first: Int, $after: String) {\n    orders(first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...OrderDetail\n        }\n      }\n    }\n  }\n": typeof types.OrderHistoryDocument,
    "\n  query OrderById($id: ID!) {\n    order(id: $id) {\n      ...OrderDetail\n    }\n  }\n": typeof types.OrderByIdDocument,
    "\n  mutation AddToCart($productId: ID!, $quantity: Int) {\n    addToCart(productId: $productId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.AddToCartDocument,
    "\n  mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {\n    changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.ChangeCartLineQuantityDocument,
    "\n  mutation RemoveCartLine($lineId: ID!) {\n    removeCartLine(lineId: $lineId) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.RemoveCartLineDocument,
    "\n  mutation ApplyPromotionCode($code: String!) {\n    applyPromotionCode(code: $code) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.ApplyPromotionCodeDocument,
    "\n  mutation RemovePromotionCode {\n    removePromotionCode {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.RemovePromotionCodeDocument,
    "\n  mutation PlaceOrder($idempotencyKey: String) {\n    placeOrder(idempotencyKey: $idempotencyKey) {\n      order {\n        ...OrderDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.PlaceOrderDocument,
    "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.RegisterDocument,
    "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.LoginDocument,
    "\n  mutation RefreshSession {\n    refreshSession {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.RefreshSessionDocument,
    "\n  mutation Logout {\n    logout {\n      success\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.LogoutDocument,
    "\n  mutation RevokeSession($sessionId: ID!) {\n    revokeSession(sessionId: $sessionId) {\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.RevokeSessionDocument,
    "\n  mutation AddToWishlist($productId: ID!) {\n    addToWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.AddToWishlistDocument,
    "\n  mutation RemoveFromWishlist($productId: ID!) {\n    removeFromWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": typeof types.RemoveFromWishlistDocument,
};
const documents: Documents = {
    "\n  fragment ProductSummary on Product {\n    id\n    name\n    slug\n    stock\n    imageUrl\n    price {\n      amount\n      currency\n    }\n    category {\n      id\n      name\n      slug\n    }\n  }\n": types.ProductSummaryFragmentDoc,
    "\n  fragment ProductDetail on Product {\n    ...ProductSummary\n    description\n  }\n": types.ProductDetailFragmentDoc,
    "\n  fragment CartDetail on Cart {\n    id\n    updatedAt\n    subtotal {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    promotion {\n      code\n      kind\n      discount {\n        amount\n        currency\n      }\n    }\n    lines {\n      id\n      quantity\n      lineTotal {\n        amount\n        currency\n      }\n      product {\n        ...ProductSummary\n      }\n    }\n  }\n": types.CartDetailFragmentDoc,
    "\n  fragment OrderDetail on Order {\n    id\n    number\n    status\n    promotionCode\n    placedAt\n    subtotal {\n      amount\n      currency\n    }\n    discount {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    lines {\n      productName\n      quantity\n      unitPrice {\n        amount\n        currency\n      }\n      lineTotal {\n        amount\n        currency\n      }\n    }\n  }\n": types.OrderDetailFragmentDoc,
    "\n  fragment UserErrorDetail on UserError {\n    code\n    message\n    field\n  }\n": types.UserErrorDetailFragmentDoc,
    "\n  query Categories {\n    categories {\n      id\n      name\n      slug\n    }\n  }\n": types.CategoriesDocument,
    "\n  query Catalogue($filter: ProductFilter, $first: Int, $after: String) {\n    products(filter: $filter, first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...ProductSummary\n        }\n      }\n    }\n  }\n": types.CatalogueDocument,
    "\n  query ProductBySlug($slug: String!) {\n    product(slug: $slug) {\n      ...ProductDetail\n    }\n  }\n": types.ProductBySlugDocument,
    "\n  query CartContents {\n    cart {\n      ...CartDetail\n    }\n  }\n": types.CartContentsDocument,
    "\n  query SignedInCustomer {\n    me {\n      id\n      name\n      email\n    }\n    wishlist {\n      id\n    }\n  }\n": types.SignedInCustomerDocument,
    "\n  query Account {\n    me {\n      id\n      name\n      email\n      createdAt\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      wishlist {\n        ...ProductSummary\n      }\n    }\n  }\n": types.AccountDocument,
    "\n  query Wishlist {\n    wishlist {\n      ...ProductSummary\n    }\n  }\n": types.WishlistDocument,
    "\n  query OrderHistory($first: Int, $after: String) {\n    orders(first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...OrderDetail\n        }\n      }\n    }\n  }\n": types.OrderHistoryDocument,
    "\n  query OrderById($id: ID!) {\n    order(id: $id) {\n      ...OrderDetail\n    }\n  }\n": types.OrderByIdDocument,
    "\n  mutation AddToCart($productId: ID!, $quantity: Int) {\n    addToCart(productId: $productId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.AddToCartDocument,
    "\n  mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {\n    changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.ChangeCartLineQuantityDocument,
    "\n  mutation RemoveCartLine($lineId: ID!) {\n    removeCartLine(lineId: $lineId) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.RemoveCartLineDocument,
    "\n  mutation ApplyPromotionCode($code: String!) {\n    applyPromotionCode(code: $code) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.ApplyPromotionCodeDocument,
    "\n  mutation RemovePromotionCode {\n    removePromotionCode {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.RemovePromotionCodeDocument,
    "\n  mutation PlaceOrder($idempotencyKey: String) {\n    placeOrder(idempotencyKey: $idempotencyKey) {\n      order {\n        ...OrderDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.PlaceOrderDocument,
    "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.RegisterDocument,
    "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.LoginDocument,
    "\n  mutation RefreshSession {\n    refreshSession {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.RefreshSessionDocument,
    "\n  mutation Logout {\n    logout {\n      success\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.LogoutDocument,
    "\n  mutation RevokeSession($sessionId: ID!) {\n    revokeSession(sessionId: $sessionId) {\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.RevokeSessionDocument,
    "\n  mutation AddToWishlist($productId: ID!) {\n    addToWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.AddToWishlistDocument,
    "\n  mutation RemoveFromWishlist($productId: ID!) {\n    removeFromWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n": types.RemoveFromWishlistDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProductSummary on Product {\n    id\n    name\n    slug\n    stock\n    imageUrl\n    price {\n      amount\n      currency\n    }\n    category {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  fragment ProductSummary on Product {\n    id\n    name\n    slug\n    stock\n    imageUrl\n    price {\n      amount\n      currency\n    }\n    category {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProductDetail on Product {\n    ...ProductSummary\n    description\n  }\n"): (typeof documents)["\n  fragment ProductDetail on Product {\n    ...ProductSummary\n    description\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment CartDetail on Cart {\n    id\n    updatedAt\n    subtotal {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    promotion {\n      code\n      kind\n      discount {\n        amount\n        currency\n      }\n    }\n    lines {\n      id\n      quantity\n      lineTotal {\n        amount\n        currency\n      }\n      product {\n        ...ProductSummary\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment CartDetail on Cart {\n    id\n    updatedAt\n    subtotal {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    promotion {\n      code\n      kind\n      discount {\n        amount\n        currency\n      }\n    }\n    lines {\n      id\n      quantity\n      lineTotal {\n        amount\n        currency\n      }\n      product {\n        ...ProductSummary\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment OrderDetail on Order {\n    id\n    number\n    status\n    promotionCode\n    placedAt\n    subtotal {\n      amount\n      currency\n    }\n    discount {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    lines {\n      productName\n      quantity\n      unitPrice {\n        amount\n        currency\n      }\n      lineTotal {\n        amount\n        currency\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment OrderDetail on Order {\n    id\n    number\n    status\n    promotionCode\n    placedAt\n    subtotal {\n      amount\n      currency\n    }\n    discount {\n      amount\n      currency\n    }\n    shipping {\n      amount\n      currency\n    }\n    total {\n      amount\n      currency\n    }\n    lines {\n      productName\n      quantity\n      unitPrice {\n        amount\n        currency\n      }\n      lineTotal {\n        amount\n        currency\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment UserErrorDetail on UserError {\n    code\n    message\n    field\n  }\n"): (typeof documents)["\n  fragment UserErrorDetail on UserError {\n    code\n    message\n    field\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Categories {\n    categories {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  query Categories {\n    categories {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Catalogue($filter: ProductFilter, $first: Int, $after: String) {\n    products(filter: $filter, first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...ProductSummary\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Catalogue($filter: ProductFilter, $first: Int, $after: String) {\n    products(filter: $filter, first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...ProductSummary\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProductBySlug($slug: String!) {\n    product(slug: $slug) {\n      ...ProductDetail\n    }\n  }\n"): (typeof documents)["\n  query ProductBySlug($slug: String!) {\n    product(slug: $slug) {\n      ...ProductDetail\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CartContents {\n    cart {\n      ...CartDetail\n    }\n  }\n"): (typeof documents)["\n  query CartContents {\n    cart {\n      ...CartDetail\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SignedInCustomer {\n    me {\n      id\n      name\n      email\n    }\n    wishlist {\n      id\n    }\n  }\n"): (typeof documents)["\n  query SignedInCustomer {\n    me {\n      id\n      name\n      email\n    }\n    wishlist {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Account {\n    me {\n      id\n      name\n      email\n      createdAt\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      wishlist {\n        ...ProductSummary\n      }\n    }\n  }\n"): (typeof documents)["\n  query Account {\n    me {\n      id\n      name\n      email\n      createdAt\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      wishlist {\n        ...ProductSummary\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Wishlist {\n    wishlist {\n      ...ProductSummary\n    }\n  }\n"): (typeof documents)["\n  query Wishlist {\n    wishlist {\n      ...ProductSummary\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OrderHistory($first: Int, $after: String) {\n    orders(first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...OrderDetail\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query OrderHistory($first: Int, $after: String) {\n    orders(first: $first, after: $after) {\n      totalCount\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      edges {\n        cursor\n        node {\n          ...OrderDetail\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OrderById($id: ID!) {\n    order(id: $id) {\n      ...OrderDetail\n    }\n  }\n"): (typeof documents)["\n  query OrderById($id: ID!) {\n    order(id: $id) {\n      ...OrderDetail\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddToCart($productId: ID!, $quantity: Int) {\n    addToCart(productId: $productId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddToCart($productId: ID!, $quantity: Int) {\n    addToCart(productId: $productId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {\n    changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {\n    changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {\n      availableStock\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveCartLine($lineId: ID!) {\n    removeCartLine(lineId: $lineId) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveCartLine($lineId: ID!) {\n    removeCartLine(lineId: $lineId) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ApplyPromotionCode($code: String!) {\n    applyPromotionCode(code: $code) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ApplyPromotionCode($code: String!) {\n    applyPromotionCode(code: $code) {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemovePromotionCode {\n    removePromotionCode {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RemovePromotionCode {\n    removePromotionCode {\n      cart {\n        ...CartDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PlaceOrder($idempotencyKey: String) {\n    placeOrder(idempotencyKey: $idempotencyKey) {\n      order {\n        ...OrderDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation PlaceOrder($idempotencyKey: String) {\n    placeOrder(idempotencyKey: $idempotencyKey) {\n      order {\n        ...OrderDetail\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RefreshSession {\n    refreshSession {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RefreshSession {\n    refreshSession {\n      accessToken\n      accessTokenExpiresAt\n      customer {\n        id\n        name\n        email\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Logout {\n    logout {\n      success\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation Logout {\n    logout {\n      success\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeSession($sessionId: ID!) {\n    revokeSession(sessionId: $sessionId) {\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RevokeSession($sessionId: ID!) {\n    revokeSession(sessionId: $sessionId) {\n      sessions {\n        id\n        device\n        createdAt\n        lastUsedAt\n        current\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddToWishlist($productId: ID!) {\n    addToWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddToWishlist($productId: ID!) {\n    addToWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveFromWishlist($productId: ID!) {\n    removeFromWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveFromWishlist($productId: ID!) {\n    removeFromWishlist(productId: $productId) {\n      products {\n        ...ProductSummary\n      }\n      errors {\n        ...UserErrorDetail\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;