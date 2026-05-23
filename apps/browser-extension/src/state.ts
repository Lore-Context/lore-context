import type { ExtensionState } from "./types.js";
import type { KeyValueStore } from "./queue.js";

/**
 * Default extension state. v1.0 ships with **no domains authorized**, raw
 * archive disabled, and a default endpoint that the user can change in
 * Options. The user must explicitly authorize each AI domain.
 */
export const DEFAULT_STATE: ExtensionState = {
  isAuthorized: false,
  authorizedDomains: [],
  isPaused: false,
  isPrivateMode: false,
  pausedDomains: [],
  privateDomains: [],
  rawArchiveEnabled: false,
  apiEndpoint: "https://api.lorecontext.com"
};

const STATE_KEY = "state";

export async function loadState(store: KeyValueStore): Promise<ExtensionState> {
  const raw = await store.get<Partial<ExtensionState> | undefined>(STATE_KEY);
  return mergeState(raw);
}

export async function saveState(store: KeyValueStore, state: ExtensionState): Promise<void> {
  await store.set(STATE_KEY, state);
}

export function mergeState(input: Partial<ExtensionState> | undefined): ExtensionState {
  return { ...DEFAULT_STATE, ...(input ?? {}) };
}

export function isDomainAuthorized(state: ExtensionState, domain: string): boolean {
  const d = normalizeDomain(domain);
  return state.authorizedDomains.includes(d);
}

export function isDomainCaptureBlocked(state: ExtensionState, domain: string): boolean {
  if (state.isPaused || state.isPrivateMode) return true;
  const d = normalizeDomain(domain);
  if (state.pausedDomains.includes(d)) return true;
  if (state.privateDomains.includes(d)) return true;
  return false;
}

export function authorizeDomain(state: ExtensionState, domain: string): ExtensionState {
  const d = normalizeDomain(domain);
  if (state.authorizedDomains.includes(d)) return state;
  return { ...state, authorizedDomains: [...state.authorizedDomains, d], isAuthorized: true };
}

export function revokeDomain(state: ExtensionState, domain: string): ExtensionState {
  const d = normalizeDomain(domain);
  const next = state.authorizedDomains.filter((x) => x !== d);
  return { ...state, authorizedDomains: next, isAuthorized: next.length > 0 };
}

export function pauseDomain(state: ExtensionState, domain: string): ExtensionState {
  const d = normalizeDomain(domain);
  if (state.pausedDomains.includes(d)) return state;
  return { ...state, pausedDomains: [...state.pausedDomains, d] };
}

export function resumeDomain(state: ExtensionState, domain: string): ExtensionState {
  const d = normalizeDomain(domain);
  return { ...state, pausedDomains: state.pausedDomains.filter((x) => x !== d) };
}

export function setPrivateForDomain(state: ExtensionState, domain: string, enabled: boolean): ExtensionState {
  const d = normalizeDomain(domain);
  if (enabled) {
    if (state.privateDomains.includes(d)) return state;
    return { ...state, privateDomains: [...state.privateDomains, d] };
  }
  return { ...state, privateDomains: state.privateDomains.filter((x) => x !== d) };
}

export function resetState(): ExtensionState {
  return { ...DEFAULT_STATE };
}

export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase();
}
