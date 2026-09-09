import type { IncomingHttpHeaders } from "node:http";
import { context, propagation, SpanStatusCode, trace, type Span, type Tracer } from "@opentelemetry/api";
import { ExportResultCode, W3CTraceContextPropagator, type ExportResult } from "@opentelemetry/core";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor, type ReadableSpan, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

export const tracerName = "zappy-mart";

export const serviceAttributeName = "zappy.service";

export const rememberedSpanCount = 200;

export type RecordedSpan = {
  readonly name: string;
  readonly service: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
};

export type RememberingSpanExporter = SpanExporter & {
  recorded(): readonly RecordedSpan[];
  forgetEverything(): void;
};

export function rememberingSpanExporter(howMany: number = rememberedSpanCount): RememberingSpanExporter {
  const remembered: RecordedSpan[] = [];

  return {
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
      for (const span of spans) {
        remembered.push({
          name: span.name,
          service: String(
            span.attributes[serviceAttributeName] ?? span.resource.attributes[ATTR_SERVICE_NAME] ?? tracerName
          ),
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          parentSpanId: span.parentSpanContext?.spanId ?? null
        });
      }
      while (remembered.length > howMany) {
        remembered.shift();
      }
      resultCallback({ code: ExportResultCode.SUCCESS });
    },

    async shutdown(): Promise<void> {
      remembered.length = 0;
    },

    async forceFlush(): Promise<void> {
      return undefined;
    },

    recorded(): readonly RecordedSpan[] {
      return [...remembered];
    },

    forgetEverything(): void {
      remembered.length = 0;
    }
  };
}

let installedExporter: RememberingSpanExporter | null = null;

export function startRequestTracing(serviceName: string): RememberingSpanExporter {
  if (installedExporter !== null) {
    return installedExporter;
  }
  const exporter = rememberingSpanExporter();
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    spanProcessors: [new SimpleSpanProcessor(exporter)]
  });
  provider.register({ propagator: new W3CTraceContextPropagator() });
  installedExporter = exporter;
  return exporter;
}

export function recordedSpans(): readonly RecordedSpan[] {
  return installedExporter === null ? [] : installedExporter.recorded();
}

export function forgetRecordedSpans(): void {
  installedExporter?.forgetEverything();
}

export function tracer(): Tracer {
  return trace.getTracer(tracerName);
}

export function traceHeadersOfActiveContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

export function currentTraceId(): string | null {
  const span = trace.getActiveSpan();
  if (span === undefined) {
    return null;
  }
  const traceId = span.spanContext().traceId;
  return traceId === "00000000000000000000000000000000" ? null : traceId;
}

export function withRequestSpan<Value>(
  serviceName: string,
  spanName: string,
  incomingHeaders: IncomingHttpHeaders,
  work: (span: Span) => Value
): Value {
  const carrier: Record<string, string> = {};
  for (const [name, value] of Object.entries(incomingHeaders)) {
    if (typeof value === "string") {
      carrier[name] = value;
    }
  }
  const parent = propagation.extract(context.active(), carrier);
  const span = tracer().startSpan(spanName, { attributes: { [serviceAttributeName]: serviceName } }, parent);
  return context.with(trace.setSpan(parent, span), () => work(span));
}

export function endSpanWithOutcome(span: Span, failure: unknown): void {
  if (failure !== null) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: failure instanceof Error ? failure.message : String(failure)
    });
  }
  span.end();
}

export type TracedRequest = {
  readonly method: string;
  readonly headers: IncomingHttpHeaders;
};

export type TracedResponse = {
  on(event: "finish", listener: () => void): unknown;
};

export function requestTracingMiddleware(
  serviceName: string
): (request: TracedRequest, response: TracedResponse, next: () => void) => void {
  return (request, response, next) => {
    withRequestSpan(serviceName, `${serviceName} ${request.method}`, request.headers, (span) => {
      response.on("finish", () => {
        span.end();
      });
      next();
    });
  };
}
