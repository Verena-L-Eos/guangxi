// @ts-ignore;
import React from 'react';
// @ts-ignore;
import { ArrowLeft, Settings, LogIn, LogOut, User } from 'lucide-react';

export function NavBar({
  title,
  showBack = false,
  onBack,
  $w
}) {
  const isLoggedIn = Boolean($w?.auth?.currentUser?.userId);
  const userName = $w?.auth?.currentUser?.nickName || $w?.auth?.currentUser?.name || '未登录';
  const handleLogin = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      await tcb.auth().toDefaultLoginPage({
        config_version: 'env',
        redirect_uri: window.location.href,
        query: {
          s_domain: window.location.hostname
        }
      });
    } catch (e) {
      console.error('Login error:', e);
    }
  };
  const handleLogout = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      await tcb.auth().signOut();
      await tcb.auth().signInAnonymously();
      window.location.reload();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };
  return <div className="sticky top-0 z-50 bg-[#FFF8F0]/90 backdrop-blur-md border-b border-[#F0E6D8]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {showBack && <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-all">
              <ArrowLeft size={18} className="text-gray-700" />
            </button>}
          <h1 className="font-serif text-xl font-semibold text-[#1B1B2F]">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn ? <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm">
                <User size={14} className="text-primary" />
                <span className="text-xs text-gray-600 font-sans">{userName}</span>
              </div>
              <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-danger" title="退出登录">
                <LogOut size={16} />
              </button>
            </> : <button onClick={handleLogin} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-primary text-white text-xs font-medium shadow-button hover:shadow-lg transition-all">
              <LogIn size={14} />
              登录
            </button>}
        </div>
      </div>
    </div>;
}