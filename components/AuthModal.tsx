import React, { useState } from 'react';
import { X, User, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User as UserType, Language } from '../types';
import { TRANSLATIONS } from '../constants/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
  language: Language;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, language }) => {
  const t = TRANSLATIONS[language];
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError('');

    try {
      let user;
      if (isLogin) {
        user = await AuthService.login(username, password);
      } else {
        user = await AuthService.register(username, password);
      }
      onLoginSuccess(user);
      onClose();
      // Reset form
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || t.authError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isLogin ? t.login : t.register}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.username}</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-colors"
                placeholder={t.username}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-colors"
                placeholder="••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 mt-4 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? t.login : t.register}
          </button>
        </form>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;