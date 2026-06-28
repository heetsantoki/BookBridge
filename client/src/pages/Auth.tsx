import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { BookOpen, KeyRound, Mail, User, Phone, GraduationCap, Calendar, Upload, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' })
});

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  department: z.string().min(2, { message: 'Please select a department' }),
  semester: z.coerce.number().min(1).max(8, { message: 'Semester must be between 1 and 8' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits' })
});

type LoginFields = z.infer<typeof loginSchema>;
type RegisterFields = z.infer<typeof registerSchema>;

const departments = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electrical Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Humanities & Sciences'
];

export const Auth: React.FC = () => {
  const { user, login, registerUser, googleLoginSuccess, uploadIdCard, verifyOtp, resendOtp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // OTP Verification States
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const navigate = useNavigate();

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema)
  });

  const { register: registerSignup, handleSubmit: handleSignupSubmit, watch, formState: { errors: signupErrors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema)
  });

  const watchEmail = watch('email', '');
  const isPersonalEmail = watchEmail && !watchEmail.endsWith('.edu') && !watchEmail.endsWith('.ac.in');

  const onLoginSubmit = async (data: LoginFields) => {
    setAuthError(null);
    try {
      const res = await login(data.email, data.password);
      if (res && res.requireOtpVerification) {
        setVerifyingEmail(data.email);
        setResendCooldown(60);
        return;
      }
      navigate('/');
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const onSignupSubmit = async (data: RegisterFields) => {
    setAuthError(null);
    try {
      const res = await registerUser(data);
      if (res && res.requireOtpVerification) {
        setVerifyingEmail(data.email);
        setResendCooldown(60);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Signup failed. Email might already be registered.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingEmail || otpCode.length !== 6) {
      setAuthError('Please enter a 6-digit OTP code.');
      return;
    }

    setIsVerifyingOtp(true);
    setAuthError(null);
    try {
      await verifyOtp(verifyingEmail, otpCode);
      navigate('/');
    } catch (err: any) {
      setAuthError(err.message || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verifyingEmail || resendCooldown > 0) return;
    setAuthError(null);
    try {
      await resendOtp(verifyingEmail);
      setResendCooldown(60);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend OTP.');
    }
  };

  const handleGoogleSuccess = async (response: any) => {
    setAuthError(null);
    try {
      await googleLoginSuccess(response.credential);
      navigate('/');
    } catch (err: any) {
      setAuthError(err.message || 'Google OAuth failed.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadingId(true);
    setAuthError(null);
    try {
      await uploadIdCard(uploadFile);
      setUploadSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || 'ID Upload failed.');
    } finally {
      setUploadingId(false);
    }
  };

  // If user is logged in, but not verified and has no student ID uploaded, show the student verification upload screen
  if (user && !user.isVerified && user.verificationStatus === 'pending' && !user.studentIdImage && !uploadSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 text-center animate-fade-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-6">
            <Upload className="h-6 w-6" />
          </div>
          
          <h2 className="font-outfit text-2xl font-extrabold text-dark-100 mb-2">College ID Verification</h2>
          <p className="text-sm text-dark-400 mb-6 leading-relaxed">
            Because you registered with a personal email, we need to verify your university affiliation. Upload a photo of your Student ID card to unlock listing creation and borrowing.
          </p>

          {authError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUploadId} className="flex flex-col gap-5 text-left">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-dark-800 rounded-xl p-6 bg-dark-950/40 hover:bg-dark-900/40 hover:border-brand-500/40 cursor-pointer transition-all relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                required
              />
              <Sparkles className="h-8 w-8 text-brand-400 mb-2" />
              <span className="text-sm font-semibold text-dark-200">
                {uploadFile ? uploadFile.name : 'Select ID Card Photo'}
              </span>
              <span className="text-[10px] text-dark-500 mt-1">JPEG, PNG, WEBP (Max 10MB)</span>
            </div>

            <button
              type="submit"
              disabled={!uploadFile || uploadingId}
              className="glass-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {uploadingId ? 'Uploading Card...' : 'Submit ID for Verification'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="glass-btn-secondary w-full py-3 text-sm"
            >
              Skip for now (Read-only access)
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If successfully uploaded ID card, show success message
  if (user && (uploadSuccess || (user.verificationStatus === 'pending' && user.studentIdImage))) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 text-center animate-fade-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          
          <h2 className="font-outfit text-2xl font-extrabold text-dark-100 mb-2">Verification Submitted!</h2>
          <p className="text-sm text-dark-400 mb-6 leading-relaxed">
            Your student verification request has been successfully queued. An administrator will review your Student ID upload shortly.
          </p>

          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 mb-6 text-left flex flex-col gap-1.5">
            <span className="text-xs font-bold text-dark-400">Account status</span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Pending Admin Review
            </span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="glass-btn-primary w-full py-3 text-sm"
          >
            Go to Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  // OTP Verification Screen
  if (verifyingEmail) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 text-center animate-fade-in">
          <p className="text-sm text-dark-300 mb-8 leading-relaxed max-w-sm mx-auto">
            We sent a 6-digit verification code to <span className="text-dark-100 font-bold">{verifyingEmail}</span>. Please enter it below.
          </p>

          {authError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5 text-left">
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-dark-400 tracking-widest uppercase mb-2">VERIFICATION CODE</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-dark-950/70 border border-dark-800 rounded-xl py-3.5 text-center text-xl font-bold tracking-[10px] text-dark-100 placeholder-dark-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200"
                required
              />
            </div>

            <button
              type="submit"
              disabled={otpCode.length !== 6 || isVerifyingOtp}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm transition-all duration-200 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue →'}
            </button>

            <div className="flex flex-col gap-3 items-center mt-4">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className={`text-xs font-semibold underline ${
                  resendCooldown > 0 ? 'text-dark-500 cursor-not-allowed no-underline' : 'text-indigo-400 hover:text-indigo-300'
                }`}
              >
                {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setVerifyingEmail(null);
                  setOtpCode('');
                  setAuthError(null);
                }}
                className="text-[11px] text-dark-500 hover:text-dark-300 font-semibold transition-colors"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg p-8 relative overflow-hidden animate-fade-in">
        {/* Decorative Grid Mesh */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 mb-4 shadow-glass-primary">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-outfit text-2xl font-extrabold text-dark-100 mb-1">
            {isLogin ? 'Welcome Back to BookBridge' : 'Create Your BookBridge Account'}
          </h2>
          <p className="text-xs text-dark-400">
            {isLogin ? 'Log in to exchange textbooks, reports and resources' : 'Join our university student sharing ecosystem'}
          </p>
        </div>

        {authError && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {isLogin ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">College or Personal Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                <input
                  type="email"
                  placeholder="name@college.edu or name@gmail.com"
                  className="glass-input pl-10"
                  {...registerLogin('email')}
                />
              </div>
              {loginErrors.email && <span className="text-[10px] text-red-400 font-semibold">{loginErrors.email.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="glass-input pl-10"
                  {...registerLogin('password')}
                />
              </div>
              {loginErrors.password && <span className="text-[10px] text-red-400 font-semibold">{loginErrors.password.message}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary w-full py-3 text-sm mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* SIGNUP FORM */
          <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="flex flex-col gap-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-dark-350">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                  <input
                    type="text"
                    placeholder="Enter name"
                    className="glass-input pl-10"
                    {...registerSignup('name')}
                  />
                </div>
                {signupErrors.name && <span className="text-[10px] text-red-400 font-semibold">{signupErrors.name.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-dark-350">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                  <input
                    type="text"
                    placeholder="10 digit number"
                    className="glass-input pl-10"
                    {...registerSignup('phone')}
                  />
                </div>
                {signupErrors.phone && <span className="text-[10px] text-red-400 font-semibold">{signupErrors.phone.message}</span>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Student Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                <input
                  type="email"
                  placeholder="name@college.edu or name@gmail.com"
                  className="glass-input pl-10"
                  {...registerSignup('email')}
                />
              </div>
              {signupErrors.email && <span className="text-[10px] text-red-400 font-semibold">{signupErrors.email.message}</span>}
              {isPersonalEmail && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg leading-relaxed">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  College email domain missing. A student ID card photo upload will be required.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                <input
                  type="password"
                  placeholder="•••••••• (Min 6 chars)"
                  className="glass-input pl-10"
                  {...registerSignup('password')}
                />
              </div>
              {signupErrors.password && <span className="text-[10px] text-red-400 font-semibold">{signupErrors.password.message}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-dark-350">Department</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                  <select
                    className="glass-input pl-10 appearance-none bg-dark-950"
                    {...registerSignup('department')}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                {signupErrors.department && <span className="text-[10px] text-red-400 font-semibold">{signupErrors.department.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-dark-350">Semester Level</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-500" />
                  <select
                    className="glass-input pl-10 appearance-none bg-dark-950"
                    {...registerSignup('semester')}
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                {signupErrors.semester && <span className="text-[10px] text-red-400 font-semibold">{signupErrors.semester.message}</span>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary w-full py-3 text-sm mt-2"
            >
              {loading ? 'Registering Account...' : 'Sign Up'}
            </button>
          </form>
        )}

        {/* Separator */}
        <div className="flex items-center gap-3 my-6">
          <div className="h-[1px] bg-dark-800 flex-grow" />
          <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Or Connect With</span>
          <div className="h-[1px] bg-dark-800 flex-grow" />
        </div>

        {/* Google OAuth Login Button */}
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setAuthError('Google sign in failed.')}
            theme="filled_black"
            shape="pill"
            width="340px"
          />
        </div>

        {/* Form Toggles */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setAuthError(null);
            }}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
