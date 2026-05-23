import { DEFAULT_STATE, loadState, saveState } from "./state.js";
import { maskToken } from "./redaction.js";

const chromeStore = {
  async get<T>(key: string) {
    const data = await chrome.storage.local.get(key);
    return data[key] as T | undefined;
  },
  async set<T>(key: string, value: T) {
    await chrome.storage.local.set({ [key]: value });
  }
};

async function loadSettings(): Promise<void> {
  const state = await loadState(chromeStore);
  setInput("vault-id", state.vaultId ?? "");
  setInput("api-endpoint", state.apiEndpoint);
  setText("device-token-status", state.deviceToken ? maskToken(state.deviceToken) : "Not paired");
  setChecked("raw-archive", state.rawArchiveEnabled);
  setChecked("private-mode-default", state.isPrivateMode);
}

document.getElementById("save-btn")?.addEventListener("click", async () => {
  const state = await loadState(chromeStore);
  const next = {
    ...state,
    vaultId: getInput("vault-id") || undefined,
    apiEndpoint: getInput("api-endpoint") || DEFAULT_STATE.apiEndpoint,
    rawArchiveEnabled: getChecked("raw-archive"),
    isPrivateMode: getChecked("private-mode-default")
  };
  await saveState(chromeStore, next);
  setText("save-status", "Saved!");
  setTimeout(() => setText("save-status", ""), 1800);
});

document.getElementById("reset-btn")?.addEventListener("click", async () => {
  if (!confirm("Reset extension state? This clears authorized domains, queue, and tokens.")) return;
  await chrome.storage.local.set({ state: DEFAULT_STATE, queue: [] });
  await loadSettings();
  setText("save-status", "Reset complete.");
  setTimeout(() => setText("save-status", ""), 1800);
});

document.getElementById("clear-token-btn")?.addEventListener("click", async () => {
  if (!confirm("Forget device token? You will need to re-pair from the dashboard.")) return;
  const state = await loadState(chromeStore);
  delete state.deviceToken;
  await saveState(chromeStore, state);
  await loadSettings();
});

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}
function setInput(id: string, value: string): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = value;
}
function getInput(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | null;
  return el?.value.trim() ?? "";
}
function setChecked(id: string, checked: boolean): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.checked = checked;
}
function getChecked(id: string): boolean {
  const el = document.getElementById(id) as HTMLInputElement | null;
  return Boolean(el?.checked);
}

void loadSettings();
