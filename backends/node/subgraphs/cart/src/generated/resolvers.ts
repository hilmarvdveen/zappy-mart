import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { CartModel, CartLineModel, ProductReferenceModel } from '../adapters/graphql/models.js';
import type { CartContext } from '../adapters/graphql/context.js';
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
  DateTime: { input: string; output: string; }
  _FieldSet: { input: string; output: string; }
};

export type Cart = {
  id: Scalars['ID']['output'];
  lines: Array<CartLine>;
  subtotal: Money;
  updatedAt: Scalars['DateTime']['output'];
};

export type CartLine = {
  id: Scalars['ID']['output'];
  lineTotal: Money;
  product: Product;
  quantity: Scalars['Int']['output'];
};

export type CartPayload = {
  availableStock?: Maybe<Scalars['Int']['output']>;
  cart?: Maybe<Cart>;
  errors: Array<UserError>;
};

export type Money = {
  amount: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
};

export type Mutation = {
  addToCart: CartPayload;
  changeCartLineQuantity: CartPayload;
  emptyCart: Scalars['Boolean']['output'];
  mergeAnonymousCart: Scalars['Boolean']['output'];
  removeCartLine: CartPayload;
  resetSubgraphSeed: ResetSeedPayload;
};


export type MutationaddToCartArgs = {
  productId: Scalars['ID']['input'];
  quantity?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationchangeCartLineQuantityArgs = {
  lineId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};


export type MutationemptyCartArgs = {
  cartId: Scalars['ID']['input'];
};


export type MutationmergeAnonymousCartArgs = {
  customerId: Scalars['ID']['input'];
  visitorKey: Scalars['String']['input'];
};


export type MutationremoveCartLineArgs = {
  lineId: Scalars['ID']['input'];
};

export type Product = {
  id: Scalars['ID']['output'];
};

export type Query = {
  cart: Cart;
};

export type ResetSeedPayload = {
  errors: Array<UserError>;
  loadedProducts: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
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
  Cart: Cart;
};

export type FederationReferenceTypes = {
  Cart:
    ( { __typename: 'Cart' }
    & GraphQLRecursivePick<FederationTypes['Cart'], {"id":true}> );
};



export type ResolversTypes = {
  Cart: ResolverTypeWrapper<CartModel>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CartLine: ResolverTypeWrapper<CartLineModel>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  CartPayload: ResolverTypeWrapper<Omit<CartPayload, 'cart'> & { cart?: Maybe<ResolversTypes['Cart']> }>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Money: ResolverTypeWrapper<Money>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Product: ResolverTypeWrapper<ProductReferenceModel>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ResetSeedPayload: ResolverTypeWrapper<ResetSeedPayload>;
  UserError: ResolverTypeWrapper<UserError>;
  UserErrorCode: UserErrorCode;
};

export type ResolversParentTypes = {
  Cart: CartModel;
  ID: Scalars['ID']['output'];
  CartLine: CartLineModel;
  Int: Scalars['Int']['output'];
  CartPayload: Omit<CartPayload, 'cart'> & { cart?: Maybe<ResolversParentTypes['Cart']> };
  DateTime: Scalars['DateTime']['output'];
  Money: Money;
  String: Scalars['String']['output'];
  Mutation: Record<PropertyKey, never>;
  Boolean: Scalars['Boolean']['output'];
  Product: ProductReferenceModel;
  Query: Record<PropertyKey, never>;
  ResetSeedPayload: ResetSeedPayload;
  UserError: UserError;
};

export type CartResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['Cart'] = ResolversParentTypes['Cart'], FederationReferenceType extends FederationReferenceTypes['Cart'] = FederationReferenceTypes['Cart']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Cart']> | FederationReferenceType, FederationReferenceType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lines?: Resolver<Array<ResolversTypes['CartLine']>, ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type CartLineResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['CartLine'] = ResolversParentTypes['CartLine']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineTotal?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CartPayloadResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['CartPayload'] = ResolversParentTypes['CartPayload']> = {
  availableStock?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cart?: Resolver<Maybe<ResolversTypes['Cart']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type MoneyResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = {
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addToCart?: Resolver<ResolversTypes['CartPayload'], ParentType, ContextType, RequireFields<MutationaddToCartArgs, 'productId' | 'quantity'>>;
  changeCartLineQuantity?: Resolver<ResolversTypes['CartPayload'], ParentType, ContextType, RequireFields<MutationchangeCartLineQuantityArgs, 'lineId' | 'quantity'>>;
  emptyCart?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationemptyCartArgs, 'cartId'>>;
  mergeAnonymousCart?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationmergeAnonymousCartArgs, 'customerId' | 'visitorKey'>>;
  removeCartLine?: Resolver<ResolversTypes['CartPayload'], ParentType, ContextType, RequireFields<MutationremoveCartLineArgs, 'lineId'>>;
  resetSubgraphSeed?: Resolver<ResolversTypes['ResetSeedPayload'], ParentType, ContextType>;
};

export type ProductResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  cart?: Resolver<ResolversTypes['Cart'], ParentType, ContextType>;
};

export type ResetSeedPayloadResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['ResetSeedPayload'] = ResolversParentTypes['ResetSeedPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  loadedProducts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type UserErrorResolvers<ContextType = CartContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = {
  code?: Resolver<ResolversTypes['UserErrorCode'], ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = CartContext> = {
  Cart?: CartResolvers<ContextType>;
  CartLine?: CartLineResolvers<ContextType>;
  CartPayload?: CartPayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ResetSeedPayload?: ResetSeedPayloadResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
};

