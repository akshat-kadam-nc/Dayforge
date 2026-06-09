/** Decoupled completion-reward signal. TaskRow fires it on completion; a
 *  cockpit-level CelebrationLayer renders the burst. Decoupled because the
 *  completed row immediately moves into the Completed fold and unmounts, so the
 *  reward can't live on the row itself. */
export interface CelebrateDetail {
  title: string;
  /** estimate minus logged, in minutes. Positive = under plan. */
  gained: number;
}

export const CELEBRATE_EVENT = 'dayforge:celebrate';

export function fireCelebration(detail: CelebrateDetail): void {
  window.dispatchEvent(new CustomEvent<CelebrateDetail>(CELEBRATE_EVENT, { detail }));
}
