import { TestBed } from '@angular/core/testing';
import { CheckoutAttempt } from './checkout-attempt.service';

describe('CheckoutAttempt', () => {
  let checkoutAttempt: CheckoutAttempt;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    checkoutAttempt = TestBed.inject(CheckoutAttempt);
  });

  it('makes one idempotency key and answers with it again, so a retry places no second order', () => {
    const first = checkoutAttempt.idempotencyKey();

    expect(first.length).toBeGreaterThan(0);
    expect(checkoutAttempt.idempotencyKey()).toBe(first);
  });

  it('keeps the key across a reload, because it lives in local storage', () => {
    const first = checkoutAttempt.idempotencyKey();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(CheckoutAttempt).idempotencyKey()).toBe(first);
  });

  it('makes a new key for the next checkout once the order is placed', () => {
    const first = checkoutAttempt.idempotencyKey();
    checkoutAttempt.finish();

    expect(checkoutAttempt.idempotencyKey()).not.toBe(first);
  });
});
