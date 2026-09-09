import type { GraphQLResolveInfo } from 'graphql';
import type { ProductModel, CategoryModel } from '../adapters/graphql/models.js';
import type { CatalogueContext } from '../adapters/graphql/context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  _FieldSet: { input: string; output: string; }
};

export type Category = {
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type Money = {
  amount: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
};

export type Mutation = {
  releaseStock: Scalars['Boolean']['output'];
  reserveStock: StockReservation;
  resetSeed: ResetSeedPayload;
  resetSubgraphSeed: ResetSeedPayload;
};


export type MutationreleaseStockArgs = {
  idempotencyKey: Scalars['String']['input'];
};


export type MutationreserveStockArgs = {
  idempotencyKey: Scalars['String']['input'];
  lines: Array<StockLine>;
};

export type PageInfo = {
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type Product = {
  category: Category;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  price: Money;
  slug: Scalars['String']['output'];
  stock: Scalars['Int']['output'];
};

export type ProductConnection = {
  edges: Array<ProductEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ProductEdge = {
  cursor: Scalars['String']['output'];
  node: Product;
};

export type ProductFilter = {
  categorySlug?: InputMaybe<Scalars['String']['input']>;
  inStockOnly?: InputMaybe<Scalars['Boolean']['input']>;
  nameContains?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  categories: Array<Category>;
  product?: Maybe<Product>;
  products: ProductConnection;
};


export type QueryproductArgs = {
  slug: Scalars['String']['input'];
};


export type QueryproductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ProductFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type ResetSeedPayload = {
  errors: Array<UserError>;
  loadedProducts: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type StockLine = {
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

export type StockReservation = {
  availableStock?: Maybe<Scalars['Int']['output']>;
  reserved: Scalars['Boolean']['output'];
  unavailableProductId?: Maybe<Scalars['ID']['output']>;
};

export type UserError = {
  code: UserErrorCode;
  field?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type UserErrorCode =
  | 'CART_EMPTY'
  | 'CART_LINE_NOT_FOUND'
  | 'CODE_EXHAUSTED'
  | 'CODE_EXPIRED'
  | 'CODE_MINIMUM_NOT_MET'
  | 'CODE_UNKNOWN'
  | 'CREDENTIALS_INVALID'
  | 'EMAIL_INVALID'
  | 'EMAIL_TAKEN'
  | 'NOT_AUTHENTICATED'
  | 'ORDER_NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_TOO_SHORT'
  | 'PRODUCT_NOT_FOUND'
  | 'QUANTITY_INVALID'
  | 'RATE_LIMITED'
  | 'SESSION_INVALID'
  | 'SESSION_NOT_FOUND';



export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export type FederationTypes = {
  Product: Product;
};

export type FederationReferenceTypes = {
  Product:
    ( { __typename: 'Product' }
    & GraphQLRecursivePick<FederationTypes['Product'], {"id":true}> );
};



export type ResolversTypes = {
  Category: ResolverTypeWrapper<CategoryModel>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Money: ResolverTypeWrapper<Money>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Product: ResolverTypeWrapper<ProductModel>;
  ProductConnection: ResolverTypeWrapper<Omit<ProductConnection, 'edges'> & { edges: Array<ResolversTypes['ProductEdge']> }>;
  ProductEdge: ResolverTypeWrapper<Omit<ProductEdge, 'node'> & { node: ResolversTypes['Product'] }>;
  ProductFilter: ProductFilter;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ResetSeedPayload: ResolverTypeWrapper<ResetSeedPayload>;
  StockLine: StockLine;
  StockReservation: ResolverTypeWrapper<StockReservation>;
  UserError: ResolverTypeWrapper<UserError>;
  UserErrorCode: UserErrorCode;
};

export type ResolversParentTypes = {
  Category: CategoryModel;
  ID: Scalars['ID']['output'];
  String: Scalars['String']['output'];
  Money: Money;
  Int: Scalars['Int']['output'];
  Mutation: Record<PropertyKey, never>;
  Boolean: Scalars['Boolean']['output'];
  PageInfo: PageInfo;
  Product: ProductModel;
  ProductConnection: Omit<ProductConnection, 'edges'> & { edges: Array<ResolversParentTypes['ProductEdge']> };
  ProductEdge: Omit<ProductEdge, 'node'> & { node: ResolversParentTypes['Product'] };
  ProductFilter: ProductFilter;
  Query: Record<PropertyKey, never>;
  ResetSeedPayload: ResetSeedPayload;
  StockLine: StockLine;
  StockReservation: StockReservation;
  UserError: UserError;
};

export type CategoryResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MoneyResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = {
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  releaseStock?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationreleaseStockArgs, 'idempotencyKey'>>;
  reserveStock?: Resolver<ResolversTypes['StockReservation'], ParentType, ContextType, RequireFields<MutationreserveStockArgs, 'idempotencyKey' | 'lines'>>;
  resetSeed?: Resolver<ResolversTypes['ResetSeedPayload'], ParentType, ContextType>;
  resetSubgraphSeed?: Resolver<ResolversTypes['ResetSeedPayload'], ParentType, ContextType>;
};

export type PageInfoResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ProductResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product'], FederationReferenceType extends FederationReferenceTypes['Product'] = FederationReferenceTypes['Product']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']> | FederationReferenceType, FederationReferenceType, ContextType>;
  category?: Resolver<ResolversTypes['Category'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type ProductConnectionResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['ProductConnection'] = ResolversParentTypes['ProductConnection']> = {
  edges?: Resolver<Array<ResolversTypes['ProductEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type ProductEdgeResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['ProductEdge'] = ResolversParentTypes['ProductEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryproductArgs, 'slug'>>;
  products?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, RequireFields<QueryproductsArgs, 'first'>>;
};

export type ResetSeedPayloadResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['ResetSeedPayload'] = ResolversParentTypes['ResetSeedPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  loadedProducts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type StockReservationResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['StockReservation'] = ResolversParentTypes['StockReservation']> = {
  availableStock?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  reserved?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  unavailableProductId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
};

export type UserErrorResolvers<ContextType = CatalogueContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = {
  code?: Resolver<ResolversTypes['UserErrorCode'], ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = CatalogueContext> = {
  Category?: CategoryResolvers<ContextType>;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductConnection?: ProductConnectionResolvers<ContextType>;
  ProductEdge?: ProductEdgeResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ResetSeedPayload?: ResetSeedPayloadResolvers<ContextType>;
  StockReservation?: StockReservationResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
};

