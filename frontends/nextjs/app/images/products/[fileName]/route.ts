const palette = [
  "#1e293b",
  "#0f766e",
  "#7c2d12",
  "#3730a3",
  "#065f46",
  "#7e22ce",
];

function initialsOf(name: string): string {
  const words = name.split("-").filter((word) => word.length > 0);
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function colourOf(name: string): string {
  const total = [...name].reduce(
    (running, character) => running + character.charCodeAt(0),
    0,
  );
  return palette[total % palette.length];
}

export async function GET(
  request: Request,
  context: RouteContext<"/images/products/[fileName]">,
): Promise<Response> {
  const { fileName } = await context.params;
  const name = fileName.replace(/\.svg$/, "");
  const drawing = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320" role="img" aria-label="${initialsOf(name)}"><rect width="320" height="320" fill="#f1f5f9"/><circle cx="160" cy="160" r="110" fill="${colourOf(name)}"/><text x="160" y="160" fill="#ffffff" font-family="system-ui, sans-serif" font-size="96" font-weight="600" text-anchor="middle" dominant-baseline="central">${initialsOf(name)}</text></svg>`;

  return new Response(drawing, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
