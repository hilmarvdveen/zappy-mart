import { Component, computed, input } from '@angular/core';
import { UserError, userErrorMessage } from '../../../app/api/user-error';

@Component({
  selector: 'app-user-errors',
  templateUrl: './user-errors.component.html',
  styleUrl: './user-errors.component.scss',
})
export class UserErrorsComponent {
  readonly errors = input<UserError[]>([]);
  readonly problem = input<string | null>(null);
  readonly note = input<string | null>(null);

  protected readonly sentences = computed(() => {
    const spelled = this.errors().map((error) => userErrorMessage(error.code));
    const problem = this.problem();
    const note = this.note();

    return [
      ...spelled,
      ...(note === null ? [] : [note]),
      ...(problem === null ? [] : [problem]),
    ];
  });
}
