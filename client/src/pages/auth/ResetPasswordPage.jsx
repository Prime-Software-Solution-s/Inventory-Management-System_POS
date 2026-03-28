import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { AuthShell } from './AuthShell';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const { resetPassword } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      await resetPassword({ token, password: values.password });
      toast.success('Password updated successfully.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      description="Choose a new password for your account and continue to the dashboard."
      footer={
        <>
          Want to sign in instead? <Link to="/login">Back to login</Link>
        </>
      }
    >
      <form className="stack-form" onSubmit={handleSubmit(onSubmit)}>
        <label className="field">
          <span>New Password</span>
          <input
            className="input-shell"
            type="password"
            {...register('password', {
              required: 'Password is required.',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters.',
              },
            })}
          />
          {errors.password ? <small>{errors.password.message}</small> : null}
        </label>

        <label className="field">
          <span>Confirm Password</span>
          <input
            className="input-shell"
            type="password"
            {...register('confirmPassword', {
              validate: (value) => value === watch('password') || 'Passwords do not match.',
            })}
          />
          {errors.confirmPassword ? <small>{errors.confirmPassword.message}</small> : null}
        </label>

        <Button type="submit" icon={ArrowRight} disabled={isSubmitting}>
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </AuthShell>
  );
};

export { ResetPasswordPage };
