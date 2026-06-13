import type { ModuleId } from '../types';

export function areModuleIdListsEqual(
  current: readonly ModuleId[],
  next: readonly ModuleId[],
): boolean {
  if (current.length !== next.length) return false;
  return current.every((moduleId, index) => moduleId === next[index]);
}

export function keepModuleIdListIfEqual<
  TCurrent extends readonly ModuleId[],
  TNext extends readonly ModuleId[],
>(
  current: TCurrent,
  next: TNext,
): TCurrent | TNext {
  return areModuleIdListsEqual(current, next) ? current : next;
}
