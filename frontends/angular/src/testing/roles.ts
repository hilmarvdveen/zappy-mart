const selectorByRole: Record<string, string> = {
  alert: '[role="alert"]',
  button: 'button, [role="button"]',
  caption: 'caption, [role="caption"]',
  cell: 'td, [role="cell"]',
  columnheader: 'th[scope="col"], [role="columnheader"]',
  combobox: 'select, [role="combobox"]',
  form: 'form[aria-label], form[aria-labelledby], [role="form"]',
  heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  img: 'img[alt]:not([alt=""]), [role="img"]',
  link: 'a[href], [role="link"]',
  list: 'ul, ol, [role="list"]',
  listitem: 'li, [role="listitem"]',
  navigation: 'nav, [role="navigation"]',
  region: 'section[aria-label], section[aria-labelledby], aside[aria-label], [role="region"]',
  row: 'tr, [role="row"]',
  rowheader: 'th[scope="row"], [role="rowheader"]',
  searchbox: 'input[type="search"], [role="searchbox"]',
  spinbutton: 'input[type="number"], [role="spinbutton"]',
  status: '[role="status"], output',
  table: 'table, [role="table"]',
  textbox:
    'input[type="text"], input[type="email"], input[type="password"], textarea, [role="textbox"]',
};

const formControls = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

function labelText(element: Element): string {
  if (element.id === '') {
    return '';
  }

  const root = element.getRootNode() as Document | ShadowRoot;
  const label = root.querySelector(`label[for="${element.id}"]`);

  return label?.textContent ?? '';
}

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function accessibleName(element: Element): string {
  const ariaLabel = element.getAttribute('aria-label');

  if (ariaLabel !== null) {
    return tidy(ariaLabel);
  }

  if (formControls.has(element.tagName)) {
    return tidy(labelText(element));
  }

  return tidy(element.textContent ?? '');
}

export function allByRole(root: Element, role: string, name?: string | RegExp): HTMLElement[] {
  const selector = selectorByRole[role];

  if (selector === undefined) {
    throw new Error(`No selector is mapped for the role "${role}".`);
  }

  const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));

  if (name === undefined) {
    return matches;
  }

  return matches.filter((element) => {
    const found = accessibleName(element);
    return typeof name === 'string' ? found === name : name.test(found);
  });
}

export function byRole(root: Element, role: string, name?: string | RegExp): HTMLElement {
  const matches = allByRole(root, role, name);

  if (matches.length === 0) {
    const named = name === undefined ? '' : ` named "${String(name)}"`;
    throw new Error(`No element with the role "${role}"${named} was found.`);
  }

  return matches[0];
}

export function queryByRole(
  root: Element,
  role: string,
  name?: string | RegExp
): HTMLElement | null {
  return allByRole(root, role, name)[0] ?? null;
}
