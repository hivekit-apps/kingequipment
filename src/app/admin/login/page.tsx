'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(
    errorParam === 'auth' ? 'That sign-in link expired or was invalid. Please request a new one.' : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Request failed (${res.status})`);
      }
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">King Equipment Rental</h1>
        <p className="mt-1 text-sm text-gray-600">Admin sign-in</p>
      </div>

      {status === 'sent' ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 text-center">
          <p className="text-base font-semibold text-green-800">Check your email</p>
          <p className="mt-1 text-sm text-green-700">
            If <span className="font-medium">{email}</span> is authorized, a sign-in link is on its way.
          </p>
          <p className="mt-3 text-xs text-green-700">The link expires in one hour.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              className="w-full text-base px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={status === 'sending' || !email.trim()}
            className="w-full bg-orange-700 hover:bg-orange-800 text-white font-semibold text-base px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-gray-500">
        Only authorized team members can sign in. Contact Kiril if you need access.
      </p>
    </div>
  );
}

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-sm text-center">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
