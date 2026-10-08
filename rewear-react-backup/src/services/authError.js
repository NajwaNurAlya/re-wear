// One error type for every auth adapter (mock and Supabase), so pages and AuthContext
// handle failures the same way whichever data source is active.
//
//   code    'invalid_credentials' | 'email_taken' | 'role_not_allowed' | 'validation'
//           (mock + Supabase), and Supabase only:
//           'email_confirmation_required' | 'email_not_confirmed' | 'rate_limited'
//           | 'signup_disabled' | 'network_error' | 'not_configured' | 'auth_failed'
//           | 'profile_failed'   (the profiles row could not be read; thrown by the profile adapter)
//   fields  { fieldName: message } for form-level validation errors
//
// Messages are written for end users. Raw provider errors are never put in `message`.
export class AuthError extends Error {
  constructor(code, message, fields = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.fields = fields;
  }
}
