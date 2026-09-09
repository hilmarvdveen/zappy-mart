type ProductImageProperties = {
  name: string;
  className?: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word.slice(0, 1))
    .join("")
    .toUpperCase();
}

function hueOf(name: string): number {
  let running = 0;
  for (const character of name) {
    running = (running * 31 + (character.codePointAt(0) ?? 0)) % 360;
  }
  return running;
}

export function ProductImage({ name, className }: ProductImageProperties) {
  const hue = hueOf(name);
  return (
    <svg
      role="img"
      aria-label={`Placeholder drawing for ${name}`}
      viewBox="0 0 200 200"
      className={className}
    >
      <rect width="200" height="200" fill={`hsl(${hue} 60% 93%)`} />
      <text
        x="100"
        y="122"
        textAnchor="middle"
        fontSize="72"
        fontWeight="600"
        fill={`hsl(${hue} 45% 32%)`}
      >
        {initialsOf(name)}
      </text>
    </svg>
  );
}
