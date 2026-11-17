/** Extra NoData codes come from each dataset's own metadata. Zero remains valid otherwise. */
export function isValidRasterValue(value: number, headerNoData: number | null, extraNoData: number[] = []) {
  return Number.isFinite(value) && (headerNoData === null || value !== headerNoData) && !extraNoData.includes(value);
}
