function stripTrailingDot(hostname: string): string {
  if (hostname.endsWith(".")) {
    return hostname.slice(0, hostname.length - 1);
  }
  return hostname;
}

export function getHostname(value: string): string | null {
  const trimmedValue = value.trim();
  const address = trimmedValue.includes("://")
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(address);
    const cleanHostname = stripTrailingDot(parsedUrl.hostname);
    if (cleanHostname.includes(".") === false) {
      return null;
    }
    return cleanHostname;
  } catch {
    return null;
  }
}

export function hostInDomains(hostname: string, domains: string[]): boolean {
  const normalizedHost = hostname.toLowerCase();
  for (const domain of domains) {
    const normalizedDomain = domain.toLowerCase();
    if (normalizedHost === normalizedDomain) {
      return true;
    }
    const domainSuffix = `.${normalizedDomain}`;
    if (normalizedHost.endsWith(domainSuffix)) {
      return true;
    }
  }
  return false;
}
