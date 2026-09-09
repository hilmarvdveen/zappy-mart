import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../../app/account/session.service';
import { attempt } from '../../../app/api/attempt';
import { UserError } from '../../../app/api/user-error';
import { inputValueOf } from '../../input-value';
import { UserErrorsComponent } from '../user-errors/user-errors.component';

export type LoginFormMode = 'login' | 'register';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  imports: [UserErrorsComponent],
})
export class LoginFormComponent {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly mode = input<LoginFormMode>('login');
  readonly returnTo = input<string | null>(null);

  protected readonly valueOf = inputValueOf;
  protected readonly registering = computed(() => this.mode() === 'register');
  protected readonly action = computed(() => (this.registering() ? 'Register' : 'Log in'));
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly problem = signal<string | null>(null);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.busy.set(true);

    const answered = await attempt(() => this.authenticate(), this.problem);

    this.busy.set(false);
    this.errors.set(answered ?? []);

    if (answered !== null && answered.length === 0) {
      await this.router.navigateByUrl(this.returnTo() ?? '/account');
    }
  }

  private authenticate(): Promise<UserError[]> {
    if (this.registering()) {
      return this.sessionService.register({
        name: this.name(),
        email: this.email(),
        password: this.password(),
      });
    }

    return this.sessionService.logIn({ email: this.email(), password: this.password() });
  }
}
