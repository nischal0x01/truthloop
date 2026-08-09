/* Hallmark · page: sign-up */
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';

export function SignUp() {
  return (
    <AuthLayout>
      <AuthCard mode="signup" />
    </AuthLayout>
  );
}
