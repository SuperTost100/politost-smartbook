export type LicenseAccessPhase = 'ok' | 'denied' | 'error';

/** `null` is a failed request. `has_license: false` stays denied. */
export function licensePhaseFromAccess(
  result: { has_license: boolean } | null,
): LicenseAccessPhase {
  if (!result) return 'error';
  return result.has_license ? 'ok' : 'denied';
}
