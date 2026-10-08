import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import AuthPageShell from '@/components/common/AuthPageShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { REGISTRABLE_ROLES, ROLES } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { authErrorMessage, postAuthRoute } from '@/lib/auth';
import { PASSWORD_MIN_LENGTH, validateRegister } from '@/lib/validators';

// Admin is deliberately absent: it can never be chosen at registration.
const ROLE_CHOICES = {
  [ROLES.BUYER]: { label: 'Buyer', hint: 'Shop curated pieces' },
  [ROLES.SELLER]: { label: 'Seller', hint: 'List pieces for curation' },
};

const EMPTY = { fullName: '', email: '', password: '', confirmPassword: '', role: ROLES.BUYER };

export default function RegisterPage() {
  useDocumentTitle('Register');
  const { isAuthenticated, role, register } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const formRef = useRef(null);

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(''); // set when the account exists but the email must be confirmed first

  useEffect(() => {
    if (Object.keys(errors).length) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [errors]);

  if (isAuthenticated) return <Navigate to={postAuthRoute(role, location.state?.from)} replace />;

  const change = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await register({ fullName: values.fullName, email: values.email, password: values.password, role: values.role });
      toast.success(`Welcome to RE:WEAR, ${user.fullName.split(' ')[0]}.`, { title: 'Account created' });
    } catch (err) {
      if (err?.code === 'email_confirmation_required') {
        // Not signed in yet: show the "check your email" state instead of a form error.
        setConfirmEmail(values.email.trim());
      } else if (err?.fields && Object.keys(err.fields).length) {
        setErrors(err.fields);
      } else {
        setFormError(authErrorMessage(err, 'We could not create your account. Please try again.'));
      }
      setSubmitting(false);
    }
  };

  if (confirmEmail) {
    return (
      <AuthPageShell eyebrow="Almost there" title="Check your email" intro="Your account has been created.">
        <p role="status" className="border border-dark-brown p-4 text-sm text-dark-brown">
          We sent a confirmation link to <strong className="font-medium">{confirmEmail}</strong>. Open it to activate your account, then log in.
        </p>
        <div className="mt-6">
          <Button to={ROUTES.login} state={location.state}>Go to log in</Button>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell eyebrow="Join the rack" title="Create an account" intro="Buy and sell one-of-a-kind preloved pieces, checked by our curators.">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {formError && <p role="alert" className="border border-brick p-3 text-sm text-brick">{formError}</p>}

        <Input label="Name" name="fullName" autoComplete="name" required value={values.fullName} onChange={change('fullName')} error={errors.fullName} />
        <Input label="Email" type="email" name="email" autoComplete="email" inputMode="email" required value={values.email} onChange={change('email')} error={errors.email} />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          value={values.password}
          onChange={change('password')}
          error={errors.password}
        />
        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={change('confirmPassword')}
          error={errors.confirmPassword}
        />

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">I want to</legend>
          <div className="grid grid-cols-2 gap-3">
            {REGISTRABLE_ROLES.map((r) => (
              <label key={r} className="cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={values.role === r}
                  onChange={change('role')}
                  className="peer sr-only"
                />
                <span className="block border border-brown/75 p-3 transition-colors hover:border-dark-brown peer-checked:border-dark-brown peer-checked:bg-dark-brown peer-checked:text-cream peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-dark-brown">
                  <span className="block font-medium">{ROLE_CHOICES[r].label}</span>
                  <span className="block text-sm opacity-80">{ROLE_CHOICES[r].hint}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.role && <p role="alert" className="mt-1.5 text-sm text-brick">{errors.role}</p>}
          <p className="mt-2 text-meta">Curator accounts are created by the RE:WEAR team and cannot be registered here.</p>
        </fieldset>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-brown">
        Already have an account?{' '}
        <Link to={ROUTES.login} state={location.state} className="link-underline font-medium text-dark-brown">Log in</Link>
      </p>
    </AuthPageShell>
  );
}
