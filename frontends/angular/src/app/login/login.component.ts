import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginFormComponent } from '../../shared/components/login-form/login-form.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { SessionService } from '../account/session.service';
import { userErrorMessage } from '../api/user-error';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [RouterLink, LoginFormComponent, UserErrorsComponent],
})
export class LoginComponent {
  private readonly sessionService = inject(SessionService);

  readonly returnTo = input<string | null>(null);

  protected readonly sessionEndedNote = computed(() =>
    this.sessionService.sessionEnded() ? userErrorMessage('SESSION_INVALID') : null
  );
}
