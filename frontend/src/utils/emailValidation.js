export function extractYear(email) {
  const match = email.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

export function getDomain(email) {
  const at = email.lastIndexOf('@');
  return at > -1 ? email.slice(at + 1).toLowerCase() : '';
}

export function validateAstrologerEmail(email) {
  if (!email) return 'Email is required.';
  const domain = getDomain(email);
  if (domain !== 'asmail.com') return 'Astrologer email must use @asmail.com domain.';
  const year = extractYear(email);
  if (year === null) return 'Astrologer email must contain a year (e.g. 2017–3000).';
  if (year < 2017 || year > 3000) return 'Astrologer email year must be between 2017 and 3000.';
  return null;
}

export function validateUserEmail(email) {
  if (!email) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  const domain = getDomain(email);
  if (domain === 'asmail.com') return 'This email is reserved for astrologer accounts.';
  return null;
}
