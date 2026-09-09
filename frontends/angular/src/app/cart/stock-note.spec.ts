import { stockNote } from './stock-note';

describe('stockNote', () => {
  it('says how many are left when the change carries an available stock', () => {
    expect(stockNote({ cart: null, availableStock: 1, errors: [] })).toBe(
      'We have 1 of this product left.'
    );
  });

  it('says nothing when the change carries no available stock', () => {
    expect(stockNote({ cart: null, availableStock: null, errors: [] })).toBeNull();
  });

  it('says nothing when there was no change at all', () => {
    expect(stockNote(null)).toBeNull();
  });
});
