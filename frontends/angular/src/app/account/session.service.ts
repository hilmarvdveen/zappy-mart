import { computed, inject, Injectable, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AccessTokenStore } from '../api/access-token-store';
import {
  AuthenticationFragment,
  CurrentCustomerDocument,
  LoginDocument,
  LoginInput,
  LoginMutation,
  LoginMutationVariables,
  LogoutDocument,
  LogoutMutation,
  LogoutMutationVariables,
  RegisterDocument,
  RegisterInput,
  RegisterMutation,
  RegisterMutationVariables,
  RevokeSessionDocument,
  RevokeSessionMutation,
  RevokeSessionMutationVariables,
} from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { SessionRefresher } from '../api/session-refresher';
import { UserError } from '../api/user-error';
import { SessionMarker } from './session-marker';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly apollo = inject(Apollo);
  private readonly accessTokenStore = inject(AccessTokenStore);
  private readonly sessionRefresher = inject(SessionRefresher);
  private readonly sessionMarker = inject(SessionMarker);

  private readonly customerQuery = graphqlResource(CurrentCustomerDocument, () =>
    this.accessTokenStore.signedIn() ? {} : undefined
  );

  private readonly endedElsewhere = signal(false);

  readonly signedIn = this.accessTokenStore.signedIn;
  readonly loading = this.customerQuery.isLoading;
  readonly customer = computed(() => this.customerQuery.value()?.me ?? null);
  readonly sessions = computed(() => this.customer()?.sessions ?? []);
  readonly sessionEnded = this.endedElsewhere.asReadonly();

  async restore(): Promise<void> {
    if (!this.sessionMarker.present()) {
      return;
    }

    const refreshed = await firstValueFrom(this.sessionRefresher.refresh());

    if (!refreshed) {
      this.sessionMarker.forget();
      this.endedElsewhere.set(true);
    }
  }

  async register(input: RegisterInput): Promise<UserError[]> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RegisterMutation, RegisterMutationVariables>({
        mutation: RegisterDocument,
        variables: { input },
      })
    );

    return this.acceptAuthentication(answer.data?.register);
  }

  async logIn(input: LoginInput): Promise<UserError[]> {
    this.endedElsewhere.set(false);

    const answer = await firstValueFrom(
      this.apollo.mutate<LoginMutation, LoginMutationVariables>({
        mutation: LoginDocument,
        variables: { input },
      })
    );

    return this.acceptAuthentication(answer.data?.login);
  }

  async logOut(): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate<LogoutMutation, LogoutMutationVariables>({ mutation: LogoutDocument })
    );

    await this.forgetCustomer();
  }

  async revokeSession(sessionId: string): Promise<UserError[]> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RevokeSessionMutation, RevokeSessionMutationVariables>({
        mutation: RevokeSessionDocument,
        variables: { sessionId },
      })
    );

    const payload = answer.data?.revokeSession;

    if (payload === undefined) {
      throw new Error('The store API answered without a session payload.');
    }

    if (payload.errors.length > 0) {
      return payload.errors;
    }

    if (payload.sessions.some((session) => session.current)) {
      this.customerQuery.reload();
      return payload.errors;
    }

    await this.forgetCustomer();
    return payload.errors;
  }

  private acceptAuthentication(payload: AuthenticationFragment | undefined): UserError[] {
    if (payload === undefined) {
      throw new Error('The store API answered without an authentication payload.');
    }

    if (payload.accessToken === null) {
      return payload.errors;
    }

    this.accessTokenStore.hold(payload.accessToken, payload.accessTokenExpiresAt);
    this.sessionMarker.remember();
    this.endedElsewhere.set(false);

    return payload.errors;
  }

  private async forgetCustomer(): Promise<void> {
    this.accessTokenStore.release();
    this.sessionMarker.forget();
    await this.apollo.client.clearStore();
  }
}
