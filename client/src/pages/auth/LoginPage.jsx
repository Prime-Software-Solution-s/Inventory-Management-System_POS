import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { AuthShell } from './AuthShell';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await login(values);
      toast.success('Logged in successfully.');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Sign in to continue"
      description="Access live stock, purchase orders, supplier records, and reporting."
      footer="Need access? Contact your administrator."
    >
      <form className="stack-form" onSubmit={handleSubmit(onSubmit)}>
        <label className="field">
          <span>Email</span>
          <input
            className="input-shell"
            type="email"
            placeholder="admin@inventoryos.com"
            {...register('email', { required: 'Email is required.' })}
          />
          {errors.email ? <small>{errors.email.message}</small> : null}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            className="input-shell"
            type="password"
            placeholder="Enter your password"
            {...register('password', { required: 'Password is required.' })}
          />
          {errors.password ? <small>{errors.password.message}</small> : null}
        </label>

        <div className="auth-inline-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <span>Admin / Staff supported</span>
        </div>

        <Button type="submit" icon={ArrowRight} disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Continue to Dashboard'}
        </Button>

        <Card className="demo-tip-card">
          <KeyRound size={16} />
          <span>Use your admin or staff credentials.</span>
        </Card>
      </form>
    </AuthShell>
  );
};

export { LoginPage };
