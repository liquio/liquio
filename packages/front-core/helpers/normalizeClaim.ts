interface Claim {
  digitalDocumentData?: unknown;
  [key: string]: unknown;
}

export default function normalizeClaim(claim: Claim): Claim {
  if (claim.digitalDocumentData) {
    try {
      claim.digitalDocumentData = JSON.parse(claim.digitalDocumentData as string);
    } catch {
      // Nothing to do
    }
  }

  return claim;
}
