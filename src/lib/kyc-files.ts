// Resolves a stored KYC document path to an admin-protected URL.
//
// BE saves files at `./uploads/kyc/<userID>/<docType>.<ext>` (relative to the
// auth-service working directory) and stores that string in the DB. The admin
// panel previews the file via `auth-service.StaticFS("/api/admin/kyc-files",
// "./uploads/kyc")`, so we strip the `./uploads/kyc/` prefix and rebase under
// the admin route. Cookies are forwarded automatically because the request
// goes back to the same origin through the gateway.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export function kycFileUrl(filePath: string): string {
  if (!filePath) return '';
  // Strip optional leading `./` and `uploads/kyc/`.
  const rel = filePath.replace(/^\.?\/?(uploads\/kyc\/?)?/, '');
  return `${API_URL}/admin/kyc-files/${rel}`;
}
