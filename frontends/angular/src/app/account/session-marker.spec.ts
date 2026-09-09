import { TestBed } from '@angular/core/testing';
import { SessionMarker } from './session-marker';

describe('SessionMarker', () => {
  let sessionMarker: SessionMarker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sessionMarker = TestBed.inject(SessionMarker);
    sessionMarker.forget();
  });

  it('starts with no marker, so a first visit makes no refresh request', () => {
    expect(sessionMarker.present()).toBe(false);
  });

  it('remembers that this browser has a session', () => {
    sessionMarker.remember();

    expect(sessionMarker.present()).toBe(true);
    expect(document.cookie).toContain('zappy_session=open');
  });

  it('forgets the marker again', () => {
    sessionMarker.remember();
    sessionMarker.forget();

    expect(sessionMarker.present()).toBe(false);
  });
});
