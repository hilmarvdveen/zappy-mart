import { revalidatePath } from "next/cache";

export function revalidateStorefront(): void {
  revalidatePath("/", "layout");
}
