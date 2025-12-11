export default function (claim) {
  if (claim.digitalDocumentData) {
    try {
      claim.digitalDocumentData = JSON.parse(claim.digitalDocumentData);
    } catch (e) {
      // Nothing to do
    }
  }

  return claim;
}
