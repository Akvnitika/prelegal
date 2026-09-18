import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-center font-serif text-3xl font-semibold text-navy">
          prelegal
        </p>
        <p className="mb-8 text-center text-sm text-gray-text">
          Draft legal agreements from trusted templates.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
