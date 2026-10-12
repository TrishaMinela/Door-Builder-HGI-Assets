import type { ShadowReport } from './types'
export function reportShadow(reports: ShadowReport[]) {
  const mismatches=reports.filter(report=>!report.matches)
  console.info('[inventory-shadow]', {status:mismatches.length?'mismatch':'match',comparisons:reports.length,matches:reports.length-mismatches.length,mismatches:mismatches.length,revisionId:reports[0]?.revisionId})
  for(const mismatch of mismatches)console.warn('[inventory-shadow:mismatch]',mismatch)
}
export function reportUnavailable(reason: string) { console.warn('[inventory-shadow:unavailable]',{reason,authority:'hardcoded inventory unchanged'}) }
