import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import AuthPageShell from '@/components/common/AuthPageShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { authErrorMessage, postAuthRoute } from '@/lib/auth';
import { validateLogin } from '@/lib/validators';

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { isAuthenticated, role, login } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const formRef = useRef(null);

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Move focus to the first invalid field after a failed submit.
  useEffect(() => {
    if (Object.keys(errors).length) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [errors]);

  // Already signed in (or just signed in): go where the route guard sent us from, else to the role's home.
  if (isAuthenticated) return <Navigate to={postAuthRoute(role, location.state?.from)} replace />;

  const change = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login({ email: values.email, password: values.password });
      if (user.role) toast.success(`Welcome back, ${user.fullName.split(' ')[0]}.`);
      else toast.error('You are signed in, but your account profile could not be loaded.'); // profile missing or unreadable: no role, no access
    } catch (err) {
      // AuthError messages are written for end users (invalid credentials, unconfirmed email, network, rate limit...).
      if (err?.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(authErrorMessage(err, 'We could not log you in. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell eyebrow="Welcome back" title="Log in" intro="Pick up your cart, wishlist and orders where you left them.">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="border border-brick p-3 text-sm text-brick">{formError}</p>
        )}
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={values.email}
          onChange={change('email')}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={values.password}
          onChange={change('password')}
          error={errors.password}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-brown">
        New to RE:WEAR?{' '}
        <Link to={ROUTES.register} state={location.state} className="link-underline font-medium text-dark-brown">
          Create an account
        </Link>
      </p>

    </AuthPageShell>
  );
}
