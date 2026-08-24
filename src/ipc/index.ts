/**
 * Typed wrappers over Cairn's commands.
 *
 * This is the whole of what the interface can do (contracts/ui-ipc.md). There
 * is no fetch, no filesystem, and no other channel — and there is no command
 * here that turns protection off now, because none exists.
 */
import { invoke } from '@tauri-apps/api/core';

export type ProtectionStatus = 'off' | 'in_force' | 'not_verified';

export interface ProtectionState {
  status: ProtectionStatus;
  since: number | null;
  /** When the system's own list was last read back and compared. */
  verified_at: number | null;
  /** What was actually found, not what was written. */
  entry_count_verified: number;
}

export type CategoryId =
  | 'adult'
  | 'ai'
  | 'gambling'
  | 'gaming'
  | 'messenger'
  | 'news'
  | 'shopping'
  | 'social'
  | 'streaming';

export interface CategoryPreset {
  id: CategoryId;
  label: string;
  enabled: boolean;
  entry_count: number;
  edited: boolean;
}

export interface ProtectedEntry {
  domain: string;
  sources: unknown[];
  auto_www: boolean;
}

export interface Trail {
  entries: ProtectedEntry[];
  enabled_categories: CategoryId[];
}

export interface Disclosures {
  in_force: string[];
  not_covered: string[];
  helper: string;
  encryption: string;
  administrator: string;
}

/** Why an address was not taken. Shown exactly as written. */
export interface Rejection {
  reason: string;
  kind: string;
}

export const getProtectionState = () => invoke<ProtectionState>('get_protection_state');
export const getTrail = () => invoke<Trail>('get_trail');
export const listCategories = () => invoke<CategoryPreset[]>('list_categories');
export const getDisclosures = () => invoke<Disclosures>('get_disclosures');
export const turnProtectionOn = () => invoke<ProtectionState>('turn_protection_on');

export const setCategoryEnabled = (id: CategoryId, on: boolean) =>
  invoke<void>('set_category_enabled', { id, on });

export const addCustomEntry = (input: string) =>
  invoke<string[]>('add_custom_entry', { input });

/**
 * The words for each protection state.
 *
 * Kept here so every screen says the same thing, and so the banned-word check
 * has one place to look. `not_verified` is its own state with its own sentence:
 * it is never rendered as protected, and never as something the person did
 * wrong.
 */
export const protectionWords: Record<
  ProtectionStatus,
  { title: string; detail: string; tone: 'moss' | 'amber' | 'quiet' }
> = {
  in_force: {
    title: 'Protection is on',
    detail: 'Cairn checked the system itself, and what you chose is in force.',
    tone: 'moss',
  },
  not_verified: {
    title: 'Not confirmed just now',
    detail:
      'Cairn could not check the system a moment ago, so it is not showing protection as on. It keeps trying, and it keeps what you chose.',
    tone: 'amber',
  },
  off: {
    title: 'Protection is off',
    detail: 'Nothing is protected on this machine yet.',
    tone: 'quiet',
  },
};
