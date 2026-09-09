export function inputValueOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

export function numberValueOf(event: Event): number {
  return Number.parseInt(inputValueOf(event), 10);
}

export function checkedValueOf(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

export function numberFieldOf(event: Event, fieldName: string): number {
  const form = event.target as HTMLFormElement;
  const field = form.elements.namedItem(fieldName) as HTMLInputElement;

  return Number.parseInt(field.value, 10);
}
