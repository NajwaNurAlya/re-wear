// Form validation shared by the auth pages and (as a second line of defence) the auth service.
// Each validator returns an object of { field: message }; an empty object means valid.
import { REGISTRABLE_ROLES } from '@/constants';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_MIN_LENGTH = 8;

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

export function validateLogin({ email = '', password = '' } = {}) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegister({ fullName = '', email = '', password = '', confirmPassword = '', role = '' } = {}) {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Enter your name.';
  else if (fullName.trim().length < 2) errors.fullName = 'Your name must be at least 2 characters.';

  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';

  if (!password) errors.password = 'Create a password.';
  else if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;

  if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (password && confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

  if (!REGISTRABLE_ROLES.includes(role)) errors.role = 'Choose buyer or seller.';
  return errors;
}
