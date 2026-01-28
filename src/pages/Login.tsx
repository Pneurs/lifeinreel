import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { IOSButton } from '@/components/ui/ios-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Film, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      navigate('/home');
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });

    if (error) {
      toast({
        title: 'Apple Sign-In failed',
        description: error.message,
        variant: 'destructive',
      });
      setAppleLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-background flex flex-col px-8 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-12 pt-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Film className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground mt-2">Sign in to continue your journey</p>
      </div>

      {/* Apple Sign In */}
      <div className="mb-6">
        <IOSButton
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleAppleSignIn}
          disabled={appleLoading}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          {appleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </>
          )}
        </IOSButton>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <IOSButton
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Sign In'
          )}
        </IOSButton>
      </form>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
