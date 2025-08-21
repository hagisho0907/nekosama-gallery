'use client';

import { useState } from 'react';

export default function TestLogin() {
  const [result, setResult] = useState('');

  const testLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'nekosama2024' }),
      });

      const data = await response.json();
      setResult(`Response: ${response.status} - ${JSON.stringify(data)}\nCookies: ${document.cookie}`);
    } catch (err) {
      setResult(`Error: ${err}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Login Test</h1>
      <button 
        onClick={testLogin}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Test Login
      </button>
      <pre className="bg-gray-100 p-4 rounded">{result}</pre>
    </div>
  );
}