'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-[hsl(225,28%,94%)] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏔️</div>
          <div className="text-[28px] font-light tracking-[0.5px] text-foreground">ULoG</div>
          <div className="text-xs text-muted-foreground mt-1.5">山岳ギア管理アプリ</div>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              メールアドレス
            </label>
            <Input type="email" placeholder="example@mail.com" autoComplete="email" required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              パスワード
            </label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                required
                className="pr-11"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-right -mt-1">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              パスワードを忘れた方
            </a>
          </div>

          <Button type="submit" className="w-full h-[46px] text-sm font-semibold">
            ログイン
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">または</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <Button
          variant="outline"
          className="w-full h-[44px] text-sm font-medium gap-2"
          onClick={() => router.push('/')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </Button>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          アカウントをお持ちでない方
          <a href="#" className="text-foreground font-semibold ml-1 hover:underline">新規登録</a>
        </p>
      </div>
    </div>
  );
}
