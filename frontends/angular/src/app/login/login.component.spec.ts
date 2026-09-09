import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole, queryByRole } from '../../testing/roles';
import { SessionService } from '../account/session.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let sessionEnded: ReturnType<typeof signal<boolean>>;
  let logIn: jest.Mock;

  beforeEach(async () => {
    sessionEnded = signal(false);
    logIn = jest.fn().mockResolvedValue([]);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: { sessionEnded, logIn, register: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('shows the login heading and the fields the customer fills', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Log in')).toBeTruthy();
    expect(byRole(page, 'textbox', 'Email address')).toBeTruthy();
    expect(byRole(page, 'button', 'Log in')).toBeTruthy();
    expect(queryByRole(page, 'textbox', 'Name')).toBeNull();
    expect(queryByRole(page, 'alert')).toBeNull();
  });

  it('says so when the session was ended somewhere else', () => {
    sessionEnded.set(true);
    fixture.detectChanges();

    expect(byRole(fixture.nativeElement as HTMLElement, 'alert').textContent).toContain(
      'Your session has ended. Please log in again.'
    );
  });

  it('logs the customer in and takes them where they were going', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    fixture.componentRef.setInput('returnTo', '/checkout');
    fixture.detectChanges();

    const email = byRole(page, 'textbox', 'Email address') as HTMLInputElement;
    email.value = 'jane@example.com';
    email.dispatchEvent(new Event('input'));

    const password = page.querySelector('#login-form-password') as HTMLInputElement;
    password.value = 'correct horse battery staple';
    password.dispatchEvent(new Event('input'));

    byRole(page, 'button', 'Log in').click();
    await fixture.whenStable();

    expect(logIn).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'correct horse battery staple',
    });
    expect(navigate).toHaveBeenCalledWith('/checkout');
  });
});
