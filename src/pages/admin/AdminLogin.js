import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { blocksAdminAPI } from '../../services/api';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/admin');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      // Call the Blocks Admin Login API
      const response = await blocksAdminAPI.login({
        email: formData.email,
        password: formData.password,
      });

      // Extract admin data from response
      const adminData = response.data?.data || response.data;
      
      if (!adminData || !adminData.id) {
        throw new Error('Invalid response from server');
      }

      // Login with admin data
      login({
        id: adminData.id,
        userId: adminData.id, // Store as userId for compatibility
        name: adminData.fullName || 'Admin User',
        email: adminData.email,
        fullName: adminData.fullName,
        role: 'blocks-admin',
        isActive: adminData.isActive,
        createdAt: adminData.createdAt,
      });

      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = 
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'admin@blocks.com',
      password: 'Admin@123',
    });
  };

  return (
    <div
      style={{
        backgroundImage: 'url(/249.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      className="min-h-screen flex items-center justify-center px-4
                 bg-gradient-to-br from-slate-100 via-blue-100 to-purple-100
                 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
    >
      {/* MAIN CARD */}
      <div className="relative w-full max-w-6xl min-h-[640px]
                      grid grid-cols-1 md:grid-cols-2
                      rounded-3xl overflow-hidden
                      shadow-2xl backdrop-blur-xl
                      dark:bg-slate-900/70 border border-white/20">

        {/* LEFT — LOGIN */}
        <div className="flex items-center justify-center p-8 md:p-12">
          <div className="w-full max-w-md space-y-8 font-[Inter]">

            {/* Header */}
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-xl
                              bg-gradient-to-br
                              from-[hsl(var(--brand-primary))]
                              to-[hsl(var(--brand-secondary))]
                              flex items-center justify-center shadow-lg">
                <Shield className="text-white w-7 h-7" />
              </div>

              <h2 className="mt-6 text-[2.4rem] leading-tight
                             font-extrabold tracking-tight
                             text-slate-900 dark:text-white">
                Admin Login
              </h2>

              <p className="mt-3 text-sm leading-relaxed
                            text-slate-600 dark:text-slate-400">
                Secure access to your administration workspace
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10
                              border border-red-500/30
                              px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full rounded-xl px-4 py-3
                           text-[15px] font-medium
                           placeholder:text-slate-400
                           dark:placeholder:text-slate-500
                           bg-white/80 dark:bg-slate-800/80
                           border border-slate-200 dark:border-slate-700
                           focus:ring-2 focus:ring-[hsl(var(--brand-primary))]
                           focus:border-transparent outline-none transition"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full rounded-xl px-4 py-3 pr-12
                             text-[15px] font-medium
                             placeholder:text-slate-400
                             dark:placeholder:text-slate-500
                             bg-white/80 dark:bg-slate-800/80
                             border border-slate-200 dark:border-slate-700
                             focus:ring-2 focus:ring-[hsl(var(--brand-primary))]
                             focus:border-transparent outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4
                             flex items-center text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl py-3
                           font-semibold tracking-wide
                           bg-gradient-to-r
                           from-[hsl(var(--brand-primary))]
                           to-[hsl(var(--brand-secondary))]
                           text-white shadow-lg
                           hover:scale-[1.01] transition"
              >
                <LogIn className="w-4 h-4 mr-2" />
                <span className="tracking-wide">
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </span>
              </Button>
            </form>

            {/* Demo Login */}
            <button
              onClick={handleDemoLogin}
              className="w-full text-sm font-medium tracking-wide
                         text-slate-700 dark:text-slate-300
                         hover:underline text-center transition"
            >
              Use demo credentials
            </button>

            {/* Demo Creds */}
            <p className="text-xs text-center tracking-wide
                          text-slate-500 dark:text-slate-400">
              admin@blocks.com • Admin@123
            </p>
            
            {/* Signup Link */}
            <div className="text-center mt-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Don't have an account?{' '}
              </span>
              <button
                onClick={() => navigate('/admin/signup')}
                className="text-sm font-semibold
                           text-[hsl(var(--brand-primary))]
                           hover:underline transition"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — BRAND / ANIMATION */}
        <div className="relative hidden md:grid place-items-center
                        overflow-hidden
                        bg-gradient-to-br
                        from-[hsl(var(--brand-secondary))]
                        via-[hsl(var(--brand-primary))]
                        to-[hsl(var(--brand-accent))]
                        animate-gradient">

          <div className="absolute inset-0 backdrop-blur-xl" />

          <div className="absolute -top-24 -left-24 w-96 h-96
                          bg-purple-100/40 rounded-full
                          blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96
                          bg-blue-100/40 rounded-full
                          blur-3xl animate-pulse delay-700" />

          <div className="relative z-10 text-center px-12">
            <img
              src="/blocks-icon-128px.png"
              alt="Logo"
              className="mx-auto h-20 w-20 rounded-lg shadow-lg mb-4"
            />

            <span className="inline-block mb-4 px-4 py-1 rounded-full
                             bg-white/20 text-xs tracking-widest uppercase
                             text-black/70 backdrop-blur-md">
              Admin Portal
            </span>

            <h1 className="text-[3.5rem] leading-tight font-extrabold
                           bg-gradient-to-br from-black via-black/80 to-black/60
                           bg-clip-text text-transparent drop-shadow-sm">
              Welcome Back
            </h1>

            <p className="mt-6 text-lg leading-relaxed
                          text-black/75 max-w-md mx-auto font-medium">
              Monitor investments, manage properties, and oversee platform
              operations with precision and confidence.
            </p>

            <div className="mt-10 mx-auto h-px w-24 bg-black/30 rounded-full" />

            <p className="mt-6 text-sm tracking-wide uppercase text-black/60">
              Secure • Real-Time • Enterprise-Ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
