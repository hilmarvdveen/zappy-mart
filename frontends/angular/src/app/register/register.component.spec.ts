import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole } from '../../testing/roles';
import { SessionService } from '../account/session.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let register: jest.Mock;

  beforeEach(async () => {
    register = jest.fn().mockResolvedValue([]);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: { register, logIn: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  it('asks for a name, an email address and a password', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Register')).toBeTruthy();
    expect(byRole(page, 'textbox', 'Name')).toBeTruthy();
    expect(byRole(page, 'textbox', 'Email address')).toBeTruthy();
    expect(byRole(page, 'button', 'Register')).toBeTruthy();
  });

  it('registers the customer and takes them to their account', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const name = byRole(page, 'textbox', 'Name') as HTMLInputElement;
    name.value = 'Sam Rider';
    name.dispatchEvent(new Event('input'));

    const email = byRole(page, 'textbox', 'Email address') as HTMLInputElement;
    email.value = 'sam@example.com';
    email.dispatchEvent(new Event('input'));

    const password = page.querySelector('#login-form-password') as HTMLInputElement;
    password.value = 'correct horse battery staple';
    password.dispatchEvent(new Event('input'));

    byRole(page, 'button', 'Register').click();
    await fixture.whenStable();

    expect(register).toHaveBeenCalledWith({
      name: 'Sam Rider',
      email: 'sam@example.com',
      password: 'correct horse battery staple',
    });
    expect(navigate).toHaveBeenCalledWith('/account');
  });
});
