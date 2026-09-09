import type { GraphQLResolveInfo } from 'graphql';
import type { CartReferenceModel } from '../adapters/graphql/models.js';
import type { PromotionsContext } from '../adapters/graphql/context.js';
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

export type AppliedPromotion = {
  code: Scalars['String']['output'];
  discount: Money;
  kind: PromotionKind;
};

export type Cart = {
  id: Scalars['ID']['output'];
  promotion?: Maybe<AppliedPromotion>;
  shipping: Money;
  subtotal: Money;
  total: Money;
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
  applyPromotionCode: CartPayload;
  clearCartPromotion: Scalars['Boolean']['output'];
  countPromotionUse: Scalars['Boolean']['output'];
  removePromotionCode: CartPayload;
  resetSubgraphSeed: ResetSeedPayload;
};


export type MutationapplyPromotionCodeArgs = {
  code: Scalars['String']['input'];
};


export type MutationclearCartPromotionArgs = {
  cartId: Scalars['ID']['input'];
};


export type MutationcountPromotionUseArgs = {
  code: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
};

export type PromotionKind =
  | 'FIXED_AMOUNT'
  | 'FREE_SHIPPING'
  | 'PERCENTAGE';

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
    & GraphQLRecursivePick<FederationTypes['Cart'], {"id":true}>
    & ( Record<PropertyKey, never>
        | GraphQLRecursivePick<FederationTypes['Cart'], {"subtotal":{"amount":true,"currency":true}}>
        | GraphQLRecursivePick<FederationTypes['Cart'], {"subtotal":{"amount":true,"currency":true}}>
        | GraphQLRecursivePick<FederationTypes['Cart'], {"subtotal":{"amount":true,"currency":true}}>
        | GraphQLRecursivePick<FederationTypes['Cart'], {"subtotal":{"amount":true,"currency":true}}>
        | GraphQLRecursivePick<FederationTypes['Cart'], {"subtotal":{"amount":true,"currency":true}}>
        | GraphQLRecursivePick<FederationTypes['Cart'], {"subtotal":{"amount":true,"currency":true}}>
        | GraphQLRecursivePick<FederationTypes['Cart'], {"subtotal":{"amount":true,"currency":true}}> ) );
};



export type ResolversTypes = {
  AppliedPromotion: ResolverTypeWrapper<AppliedPromotion>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Cart: ResolverTypeWrapper<CartReferenceModel>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CartPayload: ResolverTypeWrapper<Omit<CartPayload, 'cart'> & { cart?: Maybe<ResolversTypes['Cart']> }>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Money: ResolverTypeWrapper<Money>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  PromotionKind: PromotionKind;
  ResetSeedPayload: ResolverTypeWrapper<ResetSeedPayload>;
  UserError: ResolverTypeWrapper<UserError>;
  UserErrorCode: UserErrorCode;
};

export type ResolversParentTypes = {
  AppliedPromotion: AppliedPromotion;
  String: Scalars['String']['output'];
  Cart: CartReferenceModel;
  ID: Scalars['ID']['output'];
  CartPayload: Omit<CartPayload, 'cart'> & { cart?: Maybe<ResolversParentTypes['Cart']> };
  Int: Scalars['Int']['output'];
  Money: Money;
  Mutation: Record<PropertyKey, never>;
  Boolean: Scalars['Boolean']['output'];
  ResetSeedPayload: ResetSeedPayload;
  UserError: UserError;
};

export type AppliedPromotionResolvers<ContextType = PromotionsContext, ParentType extends ResolversParentTypes['AppliedPromotion'] = ResolversParentTypes['AppliedPromotion']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  discount?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['PromotionKind'], ParentType, ContextType>;
};

export type CartResolvers<ContextType = PromotionsContext, ParentType extends ResolversParentTypes['Cart'] = ResolversParentTypes['Cart'], FederationReferenceType extends FederationReferenceTypes['Cart'] = FederationReferenceTypes['Cart']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Cart']> | FederationReferenceType, FederationReferenceType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  promotion?: Resolver<Maybe<ResolversTypes['AppliedPromotion']>, ParentType, ContextType>;
  shipping?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
};

export type CartPayloadResolvers<ContextType = PromotionsContext, ParentType extends ResolversParentTypes['CartPayload'] = ResolversParentTypes['CartPayload']> = {
  availableStock?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cart?: Resolver<Maybe<ResolversTypes['Cart']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
};

export type MoneyResolvers<ContextType = PromotionsContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = {
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = PromotionsContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  applyPromotionCode?: Resolver<ResolversTypes['CartPayload'], ParentType, ContextType, RequireFields<MutationapplyPromotionCodeArgs, 'code'>>;
  clearCartPromotion?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationclearCartPromotionArgs, 'cartId'>>;
  countPromotionUse?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationcountPromotionUseArgs, 'code' | 'orderId'>>;
  removePromotionCode?: Resolver<ResolversTypes['CartPayload'], ParentType, ContextType>;
  resetSubgraphSeed?: Resolver<ResolversTypes['ResetSeedPayload'], ParentType, ContextType>;
};

export type ResetSeedPayloadResolvers<ContextType = PromotionsContext, ParentType extends ResolversParentTypes['ResetSeedPayload'] = ResolversParentTypes['ResetSeedPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  loadedProducts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type UserErrorResolvers<ContextType = PromotionsContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = {
  code?: Resolver<ResolversTypes['UserErrorCode'], ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = PromotionsContext> = {
  AppliedPromotion?: AppliedPromotionResolvers<ContextType>;
  Cart?: CartResolvers<ContextType>;
  CartPayload?: CartPayloadResolvers<ContextType>;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  ResetSeedPayload?: ResetSeedPayloadResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
};

