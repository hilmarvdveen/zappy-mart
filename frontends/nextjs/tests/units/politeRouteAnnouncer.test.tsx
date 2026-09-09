import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { PoliteRouteAnnouncer } from "@/components/PoliteRouteAnnouncer";

function announcerElement(): Element | null {
  const container = document.getElementsByName("next-route-announcer")[0];
  return container?.shadowRoot?.firstElementChild ?? null;
}

describe("the route announcer the store front installs", () => {
  beforeEach(() => {
    for (const container of Array.from(
      document.getElementsByTagName("next-route-announcer"),
    )) {
      container.remove();
    }
  });

  it("announces politely and carries no live region role", () => {
    render(<PoliteRouteAnnouncer />);

    const announcer = announcerElement();
    expect(announcer).not.toBeNull();
    expect(announcer).toHaveAttribute("aria-live", "polite");
    expect(announcer).toHaveAttribute("aria-atomic", "true");
    expect(announcer).not.toHaveAttribute("role");
  });

  it("leaves an alert on the screen as the only alert", () => {
    render(
      <>
        <PoliteRouteAnnouncer />
        <p role="alert">Your session has ended. Please log in again.</p>
      </>,
    );

    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("installs one announcer even when it is rendered twice", () => {
    render(
      <>
        <PoliteRouteAnnouncer />
        <PoliteRouteAnnouncer />
      </>,
    );

    expect(
      document.getElementsByTagName("next-route-announcer"),
    ).toHaveLength(1);
  });
});
