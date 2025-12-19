import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { blocksAdminAPI } from '../../services/api';

const AdminSignup = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    fullName: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/admin');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Call the Blocks Admin Signup API
      const response = await blocksAdminAPI.signup({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });

      // Extract admin data from response
      const adminData = response.data?.data || response.data;
      
      if (!adminData || !adminData.id) {
        throw new Error('Invalid response from server');
      }

      setSuccess('Account created successfully! Logging you in...');

      // Auto-login after successful signup
      setTimeout(() => {
        login({
          id: adminData.id,
          userId: adminData.id,
          name: adminData.fullName || 'Admin User',
          email: adminData.email,
          fullName: adminData.fullName,
          role: 'blocks-admin',
          isActive: adminData.isActive,
          createdAt: adminData.createdAt,
        });

        navigate('/admin');
      }, 1500);
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = 
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'Signup failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
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

        {/* LEFT — SIGNUP FORM */}
        <div className="flex items-center justify-center p-8 md:p-12">
          <div className="w-full max-w-md space-y-6 font-[Inter]">

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
                Admin Signup
              </h2>

              <p className="mt-3 text-sm leading-relaxed
                            text-slate-600 dark:text-slate-400">
                Create your Blocks admin account
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

            {/* Success */}
            {success && (
              <div className="rounded-lg bg-green-500/10
                              border border-green-500/30
                              px-4 py-3 text-sm text-green-600">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
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
                  placeholder="Password (min. 8 characters)"
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

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-4
                             flex items-center text-slate-400"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading || success}
                className="w-full rounded-xl py-3
                           font-semibold tracking-wide
                           bg-gradient-to-r
                           from-[hsl(var(--brand-primary))]
                           to-[hsl(var(--brand-secondary))]
                           text-white shadow-lg
                           hover:scale-[1.01] transition"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="tracking-wide">
                  {isLoading ? 'Creating account…' : success ? 'Success!' : 'Create Account'}
                </span>
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
              </span>
              <button
                onClick={() => navigate('/admin/login')}
                className="text-sm font-semibold
                           text-[hsl(var(--brand-primary))]
                           hover:underline transition"
              >
                Sign in
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
              Join Us
            </h1>

            <p className="mt-6 text-lg leading-relaxed
                          text-black/75 max-w-md mx-auto font-medium">
              Create your admin account to manage investments, properties, 
              and oversee the platform with full control.
            </p>

            <div className="mt-10 mx-auto h-px w-24 bg-black/30 rounded-full" />

            <p className="mt-6 text-sm tracking-wide uppercase text-black/60">
              Secure • Professional • Efficient
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;


