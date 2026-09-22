import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';

export function EmailConfirmedPage() {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);

  async function handleGoToLogin() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        <Card className="shadow-pop border-line bg-bg-2">
          <CardBody className="p-6 sm:p-8">
            <div className="text-center space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-win/10 border border-win/20">
                <CheckCircle2 className="h-7 w-7 text-win" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold text-fg">
                  Email Confirmed
                </h1>

                <p className="text-sm text-fg-muted">
                  Your email has been confirmed successfully.
                </p>

                <p className="text-sm text-fg-muted">
                  You can now log in to your PrecisionJournal account.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleGoToLogin}
                className="w-full h-11 font-semibold"
              >
                Go to Login
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}