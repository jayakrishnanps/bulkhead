function handleDotDot(segments: string[], isAbsolute: boolean): void {
  const lastSegment = segments[segments.length - 1];
  if (lastSegment !== undefined) {
    if (lastSegment === "..") {
      if (isAbsolute === false) {
        segments.push("..");
      }
      return;
    }
    segments.pop();
    return;
  }
  if (isAbsolute === false) {
    segments.push("..");
  }
}

function expandHomeTilde(value: string, home: string): string {
  if (value === "~") {
    return home;
  }
  if (value.startsWith("~/")) {
    return `${home}${value.slice(1)}`;
  }
  return value;
}

export function normalizePath(value: string, home: string): string {
  const forwardSlashPath = value.replaceAll("\\", "/");
  const expandedPath = expandHomeTilde(forwardSlashPath, home);
  const isAbsolute = expandedPath.startsWith("/");
  const rawSegments = expandedPath.split("/");
  const segments: string[] = [];

  for (const segment of rawSegments) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      handleDotDot(segments, isAbsolute);
      continue;
    }
    segments.push(segment);
  }

  const joined = segments.join("/");
  if (isAbsolute) {
    return `/${joined}`;
  }
  return joined;
}
