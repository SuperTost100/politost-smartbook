export interface LegalVersions {
  tos: string;
  privacy: string;
}

export interface ConsentSnapshot {
  has_consent: boolean;
  tos_version?: string;
  privacy_version?: string;
}

/** True only when the stored acceptance matches the texts currently published. */
export function consentIsCurrent(status: ConsentSnapshot, versions: LegalVersions): boolean {
  return Boolean(
    status.has_consent
    && status.tos_version === versions.tos
    && status.privacy_version === versions.privacy,
  );
}
