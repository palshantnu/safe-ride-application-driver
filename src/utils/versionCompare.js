// Compares two dotted version strings numerically, part by part
// (so "1.9" < "1.10", unlike a plain string comparison).
// Returns -1 if a<b, 0 if equal, 1 if a>b.
export const compareVersions = (a, b) => {
  const partsA = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const na = partsA[i] || 0;
    const nb = partsB[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};
