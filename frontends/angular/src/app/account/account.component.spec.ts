import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { byRole, queryByRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { AccountComponent } from './account.component';
import { SessionService } from './session.service';

const graphqlUrl = 'http://localhost:4000/graphql';

const ordersAnswer = {
  data: {
    orders: {
      totalCount: 1,
      pageInfo: { hasNextPage: false, endCursor: 'cursor-1' },
      edges: [
        {
          cursor: 'cursor-1',
          node: {
            id: 'order-1',
            number: 'ZM-2026-0001',
            status: 'PAID',
            placedAt: '2026-09-09T10:05:00Z',
            promotionCode: null,
            subtotal: { amount: 5599, currency: 'EUR' },
            discount: { amount: 0, currency: 'EUR' },
            shipping: { amount: 0, currency: 'EUR' },
            total: { amount: 5599, currency: 'EUR' },
            lines: [],
          },
        },
      ],
    },
  },
};

const sessions = [
  {
    id: 'session-1',
    device: 'Chrome on Windows',
    createdAt: '2026-09-09T09:00:00Z',
    lastUsedAt: '2026-09-09T10:00:00Z',
    current: true,
  },
  {
    id: 'session-2',
    device: 'Safari on iPhone',
    createdAt: '2026-09-01T09:00:00Z',
    lastUsedAt: '2026-09-02T10:00:00Z',
    current: false,
  },
];

describe('AccountComponent', () => {
  let fixture: ComponentFixture<AccountComponent>;
  let httpTestingController: HttpTestingController;
  let signedIn: ReturnType<typeof signal<boolean>>;
  let revokeSession: jest.Mock;
  let logOut: jest.Mock;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(AccountComponent);
    httpTestingController = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    if (signedIn()) {
      httpTestingController.expectOne(graphqlUrl).flush(ordersAnswer);
      await fixture.whenStable();
      fixture.detectChanges();
    }
  }

  beforeEach(async () => {
    signedIn = signal(true);
    revokeSession = jest.fn().mockResolvedValue([]);
    logOut = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        {
          provide: SessionService,
          useValue: {
            signedIn,
            customer: computed(() => ({
              id: 'customer-01',
              name: 'Jane Doe',
              email: 'jane@example.com',
            })),
            sessions: computed(() => sessions),
            revokeSession,
            logOut,
            logIn: jest.fn().mockResolvedValue([]),
            register: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('shows the order history and the open sessions of the customer', async () => {
    await render();
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Your account')).toBeTruthy();
    expect(byRole(page, 'heading', 'Order history')).toBeTruthy();
    expect(byRole(page, 'rowheader', 'ZM-2026-0001')).toBeTruthy();
    expect(byRole(page, 'heading', 'Your sessions')).toBeTruthy();
    expect(byRole(page, 'listitem', /Chrome on Windows/)).toBeTruthy();
  });

  it('revokes one session', async () => {
    await render();

    byRole(fixture.nativeElement as HTMLElement, 'button', 'Revoke Safari on iPhone').click();
    await fixture.whenStable();

    expect(revokeSession).toHaveBeenCalledWith('session-2');
  });

  it('asks an anonymous visitor to log in', async () => {
    signedIn.set(false);
    await render();

    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'form', 'Log in')).toBeTruthy();
    expect(queryByRole(page, 'heading', 'Order history')).toBeNull();
  });
});
