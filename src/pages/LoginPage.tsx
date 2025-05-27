import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LoginForm from '../components/LoginForm';
import { supabase } from '../lib/supabase'; 

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: password
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.session) {
        navigate('/admin');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (e) {
      setError('An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <LoginForm onLogin={handleLogin} error={error} />
      </main>
    </div>
  );
};

export default LoginPage;