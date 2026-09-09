export function inputValueOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

export function numberValueOf(event: Event): number {
  return Number.parseInt(inputValueOf(event), 10);
}
