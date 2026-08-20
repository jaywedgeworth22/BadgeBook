/** Curated square/round iconic marks — used when generic sources pick a wordmark. */
export type PreferredMark = {
  href?: string;
  svg?: string;
  kind: "icon";
};

export const PREFERRED_MARKS: Record<string, PreferredMark> = {
  "delta.com": {
    kind: "icon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 443.13 354"><polygon fill="#E31937" points="16.25,316.21 221.56,0 221.56,217.38"/><polygon fill="#E31937" points="0,354 221.56,354 221.56,260.39"/><polygon fill="#98002E" points="221.56,217.38 221.56,0 426.87,316.21"/><polygon fill="#98002E" points="221.56,260.39 221.56,354 443.13,354"/></svg>`,
  },
};

export function preferredFor(domain: string): PreferredMark | undefined {
  return PREFERRED_MARKS[domain];
}
