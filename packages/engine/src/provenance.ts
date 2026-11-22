import { LABELS, MIN_FRAGMENT_LENGTH } from "./constants";
import type { Label } from "./types";

export interface Provenance {
  fragments: Map<string, Label[]>;
}

export function createProvenance(): Provenance {
  return {
    fragments: new Map(),
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

function toBase64Url(base64: string): string {
  return base64
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      hex += byte.toString(16).padStart(2, "0");
    }
  }
  return hex;
}

export function variantsOf(text: string): string[] {
  const bytes = new TextEncoder().encode(text);
  const base64 = toBase64(bytes);
  const base64Url = toBase64Url(base64);
  const hex = toHex(bytes);
  const uri = encodeURIComponent(text);
  return [...new Set([text, base64, base64Url, hex, uri])];
}

function mergeLabel(target: Label[], label: Label): void {
  if (target.includes(label) === false) {
    target.push(label);
  }
}

function registerWindow(
  provenance: Provenance,
  fragment: string,
  labels: Label[],
): void {
  let existing = provenance.fragments.get(fragment);
  if (existing === undefined) {
    existing = [];
    provenance.fragments.set(fragment, existing);
  }
  for (const label of labels) {
    mergeLabel(existing, label);
  }
}

export function registerValue(
  provenance: Provenance,
  text: string,
  labels: Label[],
): void {
  if (labels.length === 0 || text.length < MIN_FRAGMENT_LENGTH) {
    return;
  }
  const variants = variantsOf(text);
  for (const variant of variants) {
    if (variant.length < MIN_FRAGMENT_LENGTH) {
      continue;
    }
    const end = variant.length - MIN_FRAGMENT_LENGTH;
    for (let start = 0; start <= end; start++) {
      const window = variant.slice(start, start + MIN_FRAGMENT_LENGTH);
      registerWindow(provenance, window, labels);
    }
  }
}

export function carriedLabels(
  provenance: Provenance,
  text: string,
): Label[] {
  if (text.length < MIN_FRAGMENT_LENGTH) {
    return [];
  }
  const found = new Set<Label>();
  const end = text.length - MIN_FRAGMENT_LENGTH;
  for (let start = 0; start <= end; start++) {
    const window = text.slice(start, start + MIN_FRAGMENT_LENGTH);
    const labels = provenance.fragments.get(window);
    if (labels === undefined) {
      continue;
    }
    for (const label of labels) {
      found.add(label);
    }
  }
  const result: Label[] = [];
  for (const label of LABELS) {
    if (found.has(label)) {
      result.push(label);
    }
  }
  return result;
}
