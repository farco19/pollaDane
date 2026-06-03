import countriesMap from "@/lib/flagcdn-countries.json";

export interface FlagCountryOption {
  code: string;
  name: string;
  flagUrl: string;
}

const hiddenCodes = new Set(["eu", "un"]);

export const flagCountries: FlagCountryOption[] = Object.entries(countriesMap)
  .filter(([code]) => !hiddenCodes.has(code) && !code.startsWith("us-"))
  .map(([code, name]) => ({
    code,
    name,
    flagUrl: buildFlagUrl(code),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, "es"));

export function buildFlagUrl(code: string) {
  return `https://flagcdn.com/${code.toLowerCase()}.svg`;
}
