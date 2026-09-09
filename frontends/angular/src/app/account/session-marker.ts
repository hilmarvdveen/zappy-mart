import { DOCUMENT, inject, Injectable } from '@angular/core';

const cookieName = 'zappy_session';

@Injectable({ providedIn: 'root' })
export class SessionMarker {
  private readonly document = inject(DOCUMENT);

  present(): boolean {
    return this.document.cookie
      .split(';')
      .some((entry) => entry.trim().startsWith(`${cookieName}=`));
  }

  remember(): void {
    this.write('open', 'max-age=2592000');
  }

  forget(): void {
    this.write('', 'max-age=0');
  }

  private write(value: string, lifetime: string): void {
    const secure = this.document.location.protocol === 'https:' ? '; secure' : '';
    this.document.cookie = `${cookieName}=${value}; path=/; samesite=lax; ${lifetime}${secure}`;
  }
}
