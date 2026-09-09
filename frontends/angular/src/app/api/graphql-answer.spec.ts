import { readGraphqlData } from './graphql-answer';

describe('readGraphqlData', () => {
  it('gives the data of a successful answer', () => {
    expect(readGraphqlData<{ categories: string[] }>({ data: { categories: ['electronics'] } })).toEqual(
      { categories: ['electronics'] }
    );
  });

  it('throws the messages of a failed answer, because a GraphQL error is not a user error', () => {
    expect(() =>
      readGraphqlData({
        data: null,
        errors: [{ message: 'Origin not allowed.' }, { message: 'Nothing was run.' }],
      })
    ).toThrow('Origin not allowed. Nothing was run.');
  });

  it('throws when the answer carries neither data nor errors', () => {
    expect(() => readGraphqlData({})).toThrow('The store API answered without data.');
  });
});
