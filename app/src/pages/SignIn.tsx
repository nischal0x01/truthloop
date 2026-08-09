/* Hallmark · page: sign-in */
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';

export function SignIn() {
  return (
    <AuthLayout>
      <AuthCard mode="signin" />
    </AuthLayout>
  );
}
