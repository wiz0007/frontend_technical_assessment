/** Rank search results by relevance while retaining all valid API matches. */
export function rankSearchResults<T>(items: T[], query: string, getPrimaryText: (item: T) => string, getSecondaryText: (item: T) => string = () => ''): T[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return items;
  const words = (value: string) => value.toLocaleLowerCase().split(/[^\\p{L}\\p{N}]+/u).filter(Boolean);
  const score = (item: T) => {
    const primary = getPrimaryText(item).toLocaleLowerCase();
    const secondary = getSecondaryText(item).toLocaleLowerCase();
    if (primary.startsWith(normalized)) return 0;
    if (words(primary).some((word) => word.startsWith(normalized))) return 1;
    if (secondary.startsWith(normalized) || words(secondary).some((word) => word.startsWith(normalized))) return 2;
    if (primary.includes(normalized)) return 3;
    if (secondary.includes(normalized)) return 4;
    return 5;
  };
  return items.map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ item }) => item);
}
