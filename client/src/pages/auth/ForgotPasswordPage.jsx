import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { AuthShell } from './AuthShell';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const [resetLink, setResetLink] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const response = await forgotPassword(values);
      setResetLink(response.resetUrl || '');
      toast.success(response.message);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      description="Generate a reset link and regain access to your inventory workspace."
      footer={
        <>
          Remembered it? <Link to="/login">Back to login</Link>
        </>
      }
    >
      <form className="stack-form" onSubmit={handleSubmit(onSubmit)}>
        <label className="field">
          <span>Email</span>
          <input
            className="input-shell"
            type="email"
            placeholder="owner@business.com"
            {...register('email', { required: 'Email is required.' })}
          />
          {errors.email ? <small>{errors.email.message}</small> : null}
        </label>

        <Button type="submit" icon={ArrowRight} disabled={isSubmitting}>
          {isSubmitting ? 'Generating link...' : 'Forgot Password'}
        </Button>
      </form>

      {resetLink ? (
        <Card className="dev-reset-card">
          <span className="section-eyebrow">Development Link</span>
          <strong>Reset password directly</strong>
          <a href={resetLink}>{resetLink}</a>
        </Card>
      ) : null}
    </AuthShell>
  );
};

export { ForgotPasswordPage };
