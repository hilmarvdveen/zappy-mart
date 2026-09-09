export interface GraphqlAnswer<TData> {
  data?: TData | null;
  errors?: { message: string }[];
}

export function readGraphqlData<TData>(answer: unknown): TData {
  const received = answer as GraphqlAnswer<TData>;

  if (received.errors !== undefined && received.errors.length > 0) {
    throw new Error(received.errors.map((failure) => failure.message).join(' '));
  }

  if (received.data === undefined || received.data === null) {
    throw new Error('The store API answered without data.');
  }

  return received.data;
}
