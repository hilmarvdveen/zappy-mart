import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  currentTraceId,
  startRequestTracing,
  traceHeadersOfActiveContext,
  withRequestSpan
} from "../src/telemetry/requestTracing.js";

const exporter = startRequestTracing("shared-test");

const incomingTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
const incomingSpanId = "00f067aa0ba902b7";
const incomingTraceparent = `00-${incomingTraceId}-${incomingSpanId}-01`;

describe("one trace per request", () => {
  it("opens a span that a following call can carry in a traceparent header", () => {
    exporter.forgetEverything();
    let carried: Record<string, string> = {};
    withRequestSpan("cart", "cart POST", {}, (span) => {
      carried = traceHeadersOfActiveContext();
      span.end();
    });
    const recorded = exporter.recorded();
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0]?.service, "cart");
    assert.match(carried["traceparent"] ?? "", /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
    assert.ok((carried["traceparent"] ?? "").includes(recorded[0]?.traceId ?? "no trace"));
  });

  it("continues the trace it was handed, so the two services share one trace id", () => {
    exporter.forgetEverything();
    withRequestSpan("gateway", "gateway POST", { traceparent: incomingTraceparent }, (gatewaySpan) => {
      const forwarded = traceHeadersOfActiveContext();
      withRequestSpan("catalogue", "catalogue POST", forwarded, (subgraphSpan) => {
        subgraphSpan.end();
      });
      gatewaySpan.end();
    });
    const recorded = exporter.recorded();
    assert.deepEqual(
      recorded.map((span) => span.service),
      ["catalogue", "gateway"]
    );
    assert.deepEqual(new Set(recorded.map((span) => span.traceId)), new Set([incomingTraceId]));
    const gateway = recorded.find((span) => span.service === "gateway");
    const catalogue = recorded.find((span) => span.service === "catalogue");
    assert.equal(gateway?.parentSpanId, incomingSpanId);
    assert.equal(catalogue?.parentSpanId, gateway?.spanId);
  });

  it("answers no trace id outside a span", () => {
    assert.equal(currentTraceId(), null);
  });

  it("keeps only the spans it was told to remember", () => {
    exporter.forgetEverything();
    assert.deepEqual(exporter.recorded(), []);
  });
});
