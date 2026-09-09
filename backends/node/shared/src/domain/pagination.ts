export const maximumPageSize = 100;

export type Page<Item> = {
  readonly edges: readonly { readonly cursor: string; readonly node: Item }[];
  readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null };
  readonly totalCount: number;
};

export function encodeCursor(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export function limitPageSize(requested: number | null | undefined, fallback: number): number {
  const asked = requested ?? fallback;
  if (asked < 0) {
    return 0;
  }
  return Math.min(asked, maximumPageSize);
}

export function pageOf<Item>(
  ordered: readonly Item[],
  cursorOf: (item: Item) => string,
  first: number,
  after: string | null | undefined
): Page<Item> {
  const startIndex = findStartIndex(ordered, cursorOf, after);
  const window = ordered.slice(startIndex, startIndex + first);
  const edges = window.map((node) => ({ cursor: encodeCursor(cursorOf(node)), node }));
  const lastEdge = edges.at(-1);
  return {
    edges,
    pageInfo: {
      hasNextPage: startIndex + first < ordered.length,
      endCursor: lastEdge ? lastEdge.cursor : null
    },
    totalCount: ordered.length
  };
}

function findStartIndex<Item>(
  ordered: readonly Item[],
  cursorOf: (item: Item) => string,
  after: string | null | undefined
): number {
  if (after === null || after === undefined) {
    return 0;
  }
  const key = decodeCursor(after);
  const index = ordered.findIndex((item) => cursorOf(item) === key);
  return index === -1 ? ordered.length : index + 1;
}
