import Image from "next/image";

export function ProductImage({
  imageUrl,
  size,
}: {
  imageUrl: string | null;
  size: number;
}) {
  return (
    <Image
      src={imageUrl ?? "/images/products/unknown.svg"}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="rounded bg-slate-100 object-contain"
    />
  );
}
