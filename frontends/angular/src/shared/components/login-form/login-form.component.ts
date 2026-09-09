import { Component, inject, signal } from '@angular/core';
import { attempt } from '../../../app/api/attempt';
import { UserError } from '../../../app/api/user-error';
import { SessionService } from '../../../app/account/session.service';
import { inputValueOf } from '../../input-value';
import { UserErrorsComponent } from '../user-errors/user-errors.component';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  imports: [UserErrorsComponent],
})
export class LoginFormComponent {
  private readonly sessionService = inject(SessionService);

  protected readonly valueOf = inputValueOf;
  protected readonly registering = signal(false);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly problem = signal<string | null>(null);

  protected switchMode(): void {
    this.registering.update((registering) => !registering);
    this.errors.set([]);
    this.problem.set(null);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.busy.set(true);

    const answered = await attempt(() => this.authenticate(), this.problem);

    this.busy.set(false);
    this.errors.set(answered ?? []);
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
