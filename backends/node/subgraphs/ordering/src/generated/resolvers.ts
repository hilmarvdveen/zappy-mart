import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { OrderModel } from '../adapters/graphql/models.js';
import type { OrderingContext } from '../adapters/graphql/context.js';
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

export type Money = {
  amount: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
};

export type Mutation = {
  placeOrder: OrderPayload;
  resetSubgraphSeed: ResetSeedPayload;
};


export type MutationplaceOrderArgs = {
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
};

export type Order = {
  discount: Money;
  id: Scalars['ID']['output'];
  lines: Array<OrderLine>;
  number: Scalars['String']['output'];
  placedAt: Scalars['DateTime']['output'];
  promotionCode?: Maybe<Scalars['String']['output']>;
  shipping: Money;
  status: OrderStatus;
  subtotal: Money;
  total: Money;
};

export type OrderConnection = {
  edges: Array<OrderEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type OrderEdge = {
  cursor: Scalars['String']['output'];
  node: Order;
};

export type OrderLine = {
  lineTotal: Money;
  productName: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  unitPrice: Money;
};

export type OrderPayload = {
  errors: Array<UserError>;
  order?: Maybe<Order>;
};

export type OrderStatus =
  | 'CANCELLED'
  | 'PAID'
  | 'PLACED';

export type PageInfo = {
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type Query = {
  order?: Maybe<Order>;
  orders: OrderConnection;
};


export type QueryorderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryordersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
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
  Order: Order;
};

export type FederationReferenceTypes = {
  Order:
    ( { __typename: 'Order' }
    & GraphQLRecursivePick<FederationTypes['Order'], {"id":true}> );
};



export type ResolversTypes = {
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Money: ResolverTypeWrapper<Money>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Order: ResolverTypeWrapper<OrderModel>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  OrderConnection: ResolverTypeWrapper<Omit<OrderConnection, 'edges'> & { edges: Array<ResolversTypes['OrderEdge']> }>;
  OrderEdge: ResolverTypeWrapper<Omit<OrderEdge, 'node'> & { node: ResolversTypes['Order'] }>;
  OrderLine: ResolverTypeWrapper<OrderLine>;
  OrderPayload: ResolverTypeWrapper<Omit<OrderPayload, 'order'> & { order?: Maybe<ResolversTypes['Order']> }>;
  OrderStatus: OrderStatus;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ResetSeedPayload: ResolverTypeWrapper<ResetSeedPayload>;
  UserError: ResolverTypeWrapper<UserError>;
  UserErrorCode: UserErrorCode;
};

export type ResolversParentTypes = {
  DateTime: Scalars['DateTime']['output'];
  Money: Money;
  Int: Scalars['Int']['output'];
  String: Scalars['String']['output'];
  Mutation: Record<PropertyKey, never>;
  Order: OrderModel;
  ID: Scalars['ID']['output'];
  OrderConnection: Omit<OrderConnection, 'edges'> & { edges: Array<ResolversParentTypes['OrderEdge']> };
  OrderEdge: Omit<OrderEdge, 'node'> & { node: ResolversParentTypes['Order'] };
  OrderLine: OrderLine;
  OrderPayload: Omit<OrderPayload, 'order'> & { order?: Maybe<ResolversParentTypes['Order']> };
  PageInfo: PageInfo;
  Boolean: Scalars['Boolean']['output'];
  Query: Record<PropertyKey, never>;
  ResetSeedPayload: ResetSeedPayload;
  UserError: UserError;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type MoneyResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = {
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  placeOrder?: Resolver<ResolversTypes['OrderPayload'], ParentType, ContextType, Partial<MutationplaceOrderArgs>>;
  resetSubgraphSeed?: Resolver<ResolversTypes['ResetSeedPayload'], ParentType, ContextType>;
};

export type OrderResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order'], FederationReferenceType extends FederationReferenceTypes['Order'] = FederationReferenceTypes['Order']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Order']> | FederationReferenceType, FederationReferenceType, ContextType>;
  discount?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lines?: Resolver<Array<ResolversTypes['OrderLine']>, ParentType, ContextType>;
  number?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  placedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  promotionCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  shipping?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
};

export type OrderConnectionResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['OrderConnection'] = ResolversParentTypes['OrderConnection']> = {
  edges?: Resolver<Array<ResolversTypes['OrderEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OrderEdgeResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['OrderEdge'] = ResolversParentTypes['OrderEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
};

export type OrderLineResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['OrderLine'] = ResolversParentTypes['OrderLine']> = {
  lineTotal?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  productName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unitPrice?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
};

export type OrderPayloadResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['OrderPayload'] = ResolversParentTypes['OrderPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType>;
};

export type PageInfoResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryorderArgs, 'id'>>;
  orders?: Resolver<ResolversTypes['OrderConnection'], ParentType, ContextType, RequireFields<QueryordersArgs, 'first'>>;
};

export type ResetSeedPayloadResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['ResetSeedPayload'] = ResolversParentTypes['ResetSeedPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  loadedProducts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type UserErrorResolvers<ContextType = OrderingContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = {
  code?: Resolver<ResolversTypes['UserErrorCode'], ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = OrderingContext> = {
  DateTime?: GraphQLScalarType;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderConnection?: OrderConnectionResolvers<ContextType>;
  OrderEdge?: OrderEdgeResolvers<ContextType>;
  OrderLine?: OrderLineResolvers<ContextType>;
  OrderPayload?: OrderPayloadResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ResetSeedPayload?: ResetSeedPayloadResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
};

