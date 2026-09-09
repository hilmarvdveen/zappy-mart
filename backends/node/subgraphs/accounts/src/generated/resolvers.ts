import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { CustomerModel, SessionModel, ProductReferenceModel } from '../adapters/graphql/models.js';
import type { AccountsContext } from '../adapters/graphql/context.js';
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

export type AuthenticationPayload = {
  accessToken?: Maybe<Scalars['String']['output']>;
  accessTokenExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  customer?: Maybe<Customer>;
  errors: Array<UserError>;
};

export type Customer = {
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sessions: Array<Session>;
  wishlist: Array<Product>;
};

export type LoginInput = {
  device?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type LogoutPayload = {
  errors: Array<UserError>;
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  addToWishlist: WishlistPayload;
  login: AuthenticationPayload;
  logout: LogoutPayload;
  refreshSession: AuthenticationPayload;
  register: AuthenticationPayload;
  removeFromWishlist: WishlistPayload;
  resetSubgraphSeed: ResetSeedPayload;
  revokeSession: RevokeSessionPayload;
};


export type MutationaddToWishlistArgs = {
  productId: Scalars['ID']['input'];
};


export type MutationloginArgs = {
  input: LoginInput;
};


export type MutationregisterArgs = {
  input: RegisterInput;
};


export type MutationremoveFromWishlistArgs = {
  productId: Scalars['ID']['input'];
};


export type MutationrevokeSessionArgs = {
  sessionId: Scalars['ID']['input'];
};

export type Product = {
  id: Scalars['ID']['output'];
};

export type Query = {
  isSessionLive: Scalars['Boolean']['output'];
  me?: Maybe<Customer>;
  wishlist: Array<Product>;
};


export type QueryisSessionLiveArgs = {
  sessionId: Scalars['ID']['input'];
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type ResetSeedPayload = {
  errors: Array<UserError>;
  loadedProducts: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type RevokeSessionPayload = {
  errors: Array<UserError>;
  sessions: Array<Session>;
};

export type Session = {
  createdAt: Scalars['DateTime']['output'];
  current: Scalars['Boolean']['output'];
  device: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastUsedAt: Scalars['DateTime']['output'];
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

export type WishlistPayload = {
  errors: Array<UserError>;
  products: Array<Product>;
};



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
  Customer: Customer;
};

export type FederationReferenceTypes = {
  Customer:
    ( { __typename: 'Customer' }
    & GraphQLRecursivePick<FederationTypes['Customer'], {"id":true}> );
};



export type ResolversTypes = {
  AuthenticationPayload: ResolverTypeWrapper<Omit<AuthenticationPayload, 'customer'> & { customer?: Maybe<ResolversTypes['Customer']> }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Customer: ResolverTypeWrapper<CustomerModel>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  LoginInput: LoginInput;
  LogoutPayload: ResolverTypeWrapper<LogoutPayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Product: ResolverTypeWrapper<ProductReferenceModel>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RegisterInput: RegisterInput;
  ResetSeedPayload: ResolverTypeWrapper<ResetSeedPayload>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  RevokeSessionPayload: ResolverTypeWrapper<Omit<RevokeSessionPayload, 'sessions'> & { sessions: Array<ResolversTypes['Session']> }>;
  Session: ResolverTypeWrapper<SessionModel>;
  UserError: ResolverTypeWrapper<UserError>;
  UserErrorCode: UserErrorCode;
  WishlistPayload: ResolverTypeWrapper<Omit<WishlistPayload, 'products'> & { products: Array<ResolversTypes['Product']> }>;
};

export type ResolversParentTypes = {
  AuthenticationPayload: Omit<AuthenticationPayload, 'customer'> & { customer?: Maybe<ResolversParentTypes['Customer']> };
  String: Scalars['String']['output'];
  Customer: CustomerModel;
  ID: Scalars['ID']['output'];
  DateTime: Scalars['DateTime']['output'];
  LoginInput: LoginInput;
  LogoutPayload: LogoutPayload;
  Boolean: Scalars['Boolean']['output'];
  Mutation: Record<PropertyKey, never>;
  Product: ProductReferenceModel;
  Query: Record<PropertyKey, never>;
  RegisterInput: RegisterInput;
  ResetSeedPayload: ResetSeedPayload;
  Int: Scalars['Int']['output'];
  RevokeSessionPayload: Omit<RevokeSessionPayload, 'sessions'> & { sessions: Array<ResolversParentTypes['Session']> };
  Session: SessionModel;
  UserError: UserError;
  WishlistPayload: Omit<WishlistPayload, 'products'> & { products: Array<ResolversParentTypes['Product']> };
};

export type AuthenticationPayloadResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['AuthenticationPayload'] = ResolversParentTypes['AuthenticationPayload']> = {
  accessToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  accessTokenExpiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
};

export type CustomerResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer'], FederationReferenceType extends FederationReferenceTypes['Customer'] = FederationReferenceTypes['Customer']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']> | FederationReferenceType, FederationReferenceType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType>;
  wishlist?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type LogoutPayloadResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['LogoutPayload'] = ResolversParentTypes['LogoutPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addToWishlist?: Resolver<ResolversTypes['WishlistPayload'], ParentType, ContextType, RequireFields<MutationaddToWishlistArgs, 'productId'>>;
  login?: Resolver<ResolversTypes['AuthenticationPayload'], ParentType, ContextType, RequireFields<MutationloginArgs, 'input'>>;
  logout?: Resolver<ResolversTypes['LogoutPayload'], ParentType, ContextType>;
  refreshSession?: Resolver<ResolversTypes['AuthenticationPayload'], ParentType, ContextType>;
  register?: Resolver<ResolversTypes['AuthenticationPayload'], ParentType, ContextType, RequireFields<MutationregisterArgs, 'input'>>;
  removeFromWishlist?: Resolver<ResolversTypes['WishlistPayload'], ParentType, ContextType, RequireFields<MutationremoveFromWishlistArgs, 'productId'>>;
  resetSubgraphSeed?: Resolver<ResolversTypes['ResetSeedPayload'], ParentType, ContextType>;
  revokeSession?: Resolver<ResolversTypes['RevokeSessionPayload'], ParentType, ContextType, RequireFields<MutationrevokeSessionArgs, 'sessionId'>>;
};

export type ProductResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  isSessionLive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<QueryisSessionLiveArgs, 'sessionId'>>;
  me?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  wishlist?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
};

export type ResetSeedPayloadResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['ResetSeedPayload'] = ResolversParentTypes['ResetSeedPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  loadedProducts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type RevokeSessionPayloadResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['RevokeSessionPayload'] = ResolversParentTypes['RevokeSessionPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  sessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType>;
};

export type SessionResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['Session'] = ResolversParentTypes['Session']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  current?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  device?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastUsedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type UserErrorResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = {
  code?: Resolver<ResolversTypes['UserErrorCode'], ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type WishlistPayloadResolvers<ContextType = AccountsContext, ParentType extends ResolversParentTypes['WishlistPayload'] = ResolversParentTypes['WishlistPayload']> = {
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = AccountsContext> = {
  AuthenticationPayload?: AuthenticationPayloadResolvers<ContextType>;
  Customer?: CustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  LogoutPayload?: LogoutPayloadResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ResetSeedPayload?: ResetSeedPayloadResolvers<ContextType>;
  RevokeSessionPayload?: RevokeSessionPayloadResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  WishlistPayload?: WishlistPayloadResolvers<ContextType>;
};

