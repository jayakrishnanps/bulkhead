const IMAGE_RE = /!\[[^\]]*\]\(([^)\s"]+)(?:\s+"[^"]*")?\)/g;

export function findImageUrls(text: string): string[] {
  const urls: string[] = [];
  for (const match of text.matchAll(IMAGE_RE)) {
    const url = match[1];
    if (url !== undefined) {
      urls.push(url);
    }
  }
  return urls;
}
