import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import AuthPageShell from '@/components/common/AuthPageShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { postAuthRoute } from '@/lib/auth';
import { validateLogin } from '@/lib/validators';
import { authService } from '@/services';

// Demo accounts exist only on the mock adapter; the Supabase adapter does not export them.
const DEMO_ACCOUNTS = authService.demoAccounts ?? [];

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { isAuthenticated, role, signIn } = useAuth();
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
      const user = await signIn({ email: values.email, password: values.password });
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}.`);
    } catch (err) {
      setFormError(err.code === 'invalid_credentials' ? err.message : 'We could not log you in. Please try again.');
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

      {DEMO_ACCOUNTS.length > 0 && (
        <section aria-labelledby="demo-title" className="mt-10 border-t border-beige pt-6">
          <h2 id="demo-title" className="title">Demo accounts</h2>
          <p className="mt-1 text-meta">For testing only. Choose one to fill the form, then log in.</p>
          <ul className="mt-4 flex flex-col">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex items-center justify-between gap-3 border-b border-beige py-3 text-sm">
                <span className="min-w-0">
                  <span className="tag-label">{a.role}</span>
                  <span className="mt-1 block truncate">{a.email}</span>
                  <span className="block text-meta">{a.password}</span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setValues({ email: a.email, password: a.password });
                    setErrors({});
                    setFormError('');
                  }}
                >
                  Use <span className="sr-only">{a.role} account</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AuthPageShell>
  );
}
