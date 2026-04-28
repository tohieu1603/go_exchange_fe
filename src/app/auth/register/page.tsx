import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 bg-gradient-to-b from-bg-primary to-bg-secondary/30">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
}
