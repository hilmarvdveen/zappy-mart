"use client";

import { useInsertionEffect } from "react";

const announcerElementName = "next-route-announcer";
const announcerIdentifier = "__next-route-announcer__";
const visuallyHidden =
  "position:absolute;border:0;height:1px;margin:-1px;padding:0;width:1px;clip:rect(0 0 0 0);overflow:hidden;white-space:nowrap;word-wrap:normal";

function installPoliteAnnouncer(): void {
  if (document.getElementsByName(announcerElementName).length > 0) {
    return;
  }
  const container = document.createElement(announcerElementName);
  container.setAttribute("name", announcerElementName);
  container.style.cssText = "position:absolute";
  const announcement = document.createElement("div");
  announcement.id = announcerIdentifier;
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.style.cssText = visuallyHidden;
  container.attachShadow({ mode: "open" }).appendChild(announcement);
  document.body.appendChild(container);
}

export function PoliteRouteAnnouncer() {
  useInsertionEffect(() => {
    installPoliteAnnouncer();
  }, []);
  return null;
}
