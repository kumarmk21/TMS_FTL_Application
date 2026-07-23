import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ZohoCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Zoho Books...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Zoho authorization denied: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received from Zoho.');
      return;
    }

    const exchange = async () => {
      try {
        const oauthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth`;
        const res = await fetch(`${oauthUrl}?action=exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || `Exchange failed (${res.status})`);
        }

        setStatus('success');
        setMessage('Connected to Zoho Books! Redirecting...');
        setTimeout(() => {
          window.location.href = '/?zoho=connected';
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to complete Zoho authorization.');
      }
    };

    exchange();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto" />
            <p className="text-gray-700 font-medium">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
            <p className="text-green-800 font-medium">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
            <p className="text-red-800 font-medium">{message}</p>
            <a
              href="/"
              className="inline-block mt-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Back to App
            </a>
          </>
        )}
      </div>
    </div>
  );
}
