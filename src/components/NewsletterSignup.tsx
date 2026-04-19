'use client';

import { useState } from 'react';

interface NewsletterProps {
  onSuccess?: () => void;
}

export default function NewsletterSignup({ onSuccess }: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/v1/waitlist/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: 'landing_page'
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || 'Something went wrong');
        return;
      }

      setSuccess(true);
      setEmail('');
      setName('');

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to connect to server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {success ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center space-y-2">
          <div className="text-green-400 text-lg font-semibold">✓ Welcome to the waitlist!</div>
          <p className="text-green-300 text-sm">Check your email for updates.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
            />
          </div>

          <div>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Waitlist'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            We'll never spam you. Unsubscribe anytime.
          </p>
        </form>
      )}
    </div>
  );
}
