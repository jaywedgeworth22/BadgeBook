/** Offline name → domain table ported from Crest (`vendor/crest/src/lib/contacts.ts`). */

import { companyKey } from "./normalize.ts";

const DOMAINS: Record<string, string> = {
  apple: "apple.com",
  "apple inc": "apple.com",
  google: "google.com",
  alphabet: "abc.xyz",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  meta: "meta.com",
  facebook: "facebook.com",
  instagram: "instagram.com",
  tesla: "tesla.com",
  nvidia: "nvidia.com",
  netflix: "netflix.com",
  spotify: "spotify.com",
  adobe: "adobe.com",
  salesforce: "salesforce.com",
  oracle: "oracle.com",
  ibm: "ibm.com",
  intel: "intel.com",
  cisco: "cisco.com",
  stripe: "stripe.com",
  paypal: "paypal.com",
  visa: "visa.com",
  mastercard: "mastercard.com",
  "american express": "americanexpress.com",
  amex: "americanexpress.com",
  chase: "chase.com",
  jpmorgan: "jpmorganchase.com",
  "jp morgan": "jpmorganchase.com",
  "jpmorgan chase": "jpmorganchase.com",
  "bank of america": "bankofamerica.com",
  "wells fargo": "wellsfargo.com",
  citi: "citi.com",
  citibank: "citi.com",
  citigroup: "citi.com",
  geico: "geico.com",
  "state farm": "statefarm.com",
  "state farm insurance": "statefarm.com",
  allstate: "allstate.com",
  "allstate insurance": "allstate.com",
  usaa: "usaa.com",
  "usaa insurance": "usaa.com",
  verizon: "verizon.com",
  "at&t": "att.com",
  att: "att.com",
  "t-mobile": "t-mobile.com",
  tmobile: "t-mobile.com",
  "united airlines": "united.com",
  united: "united.com",
  "american airlines": "aa.com",
  delta: "delta.com",
  "delta air lines": "delta.com",
  "delta airlines": "delta.com",
  southwest: "southwest.com",
  "southwest airlines": "southwest.com",
  jetblue: "jetblue.com",
  "alaska airlines": "alaskaair.com",
  fedex: "fedex.com",
  ups: "ups.com",
  usps: "usps.com",
  "the home depot": "homedepot.com",
  "home depot": "homedepot.com",
  lowes: "lowes.com",
  "lowe's": "lowes.com",
  costco: "costco.com",
  walmart: "walmart.com",
  target: "target.com",
  starbucks: "starbucks.com",
  mcdonalds: "mcdonalds.com",
  "mcdonald's": "mcdonalds.com",
  uber: "uber.com",
  lyft: "lyft.com",
  doordash: "doordash.com",
  airbnb: "airbnb.com",
  nike: "nike.com",
  samsung: "samsung.com",
  sony: "sony.com",
  ford: "ford.com",
  bmw: "bmw.com",
  "centerpoint energy": "centerpointenergy.com",
  centerpoint: "centerpointenergy.com",
  "x ai": "x.ai",
  xai: "x.ai",
  square: "squareup.com",
  "capital one": "capitalone.com",
  discover: "discover.com",
  intuit: "intuit.com",
  "h&r block": "hrblock.com",
  "h and r block": "hrblock.com",
  heb: "heb.com",
  "h-e-b": "heb.com",
  walgreens: "walgreens.com",
  cvs: "cvs.com",
  "best buy": "bestbuy.com",
  fidelity: "fidelity.com",
  vanguard: "vanguard.com",
  amtrak: "amtrak.com",
  txt: "texasbytexas.com",
  "texas by texas": "texasbytexas.com",
  gcx: "raise.com",
  raise: "raise.com",
};

const LOCATIONISH =
  /\b(rd|road|st|street|blvd|ave|avenue|dr|drive|ln|lane|hwy|fwy|pkwy|suite|ste|unit|store|shop|plaza|center|centre|mall|near|at|in|#\d*|\d{2,5}|cypress|houston|dallas|austin|tx|texas|usa)\b/i;

export function lookupCompanyDomain(name: string): string | undefined {
  const key = companyKey(name);
  if (!key) return undefined;
  if (DOMAINS[key]) return DOMAINS[key];
  const nospace = key.replace(/\s+/g, "");
  if (DOMAINS[nospace]) return DOMAINS[nospace];

  const words = key.split(" ").filter(Boolean);
  for (let i = words.length - 1; i >= 1; i -= 1) {
    const head = words.slice(0, i).join(" ");
    const tail = words.slice(i).join(" ");
    const domain = DOMAINS[head] ?? DOMAINS[head.replace(/\s+/g, "")];
    if (domain && LOCATIONISH.test(tail)) return domain;
  }
  return undefined;
}
