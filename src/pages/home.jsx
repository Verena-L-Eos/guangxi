// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Package, ClipboardList, BarChart3, Tags, Heart } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function HomePage(props) {
  const {
    $w
  } = props;
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);
  const navigate = (page, params = {}) => {
    $w.utils.navigateTo({
      pageId: page,
      params
    });
  };
  const menuItems = [{
    title: '物资填报',
    desc: '登记您的捐赠物资',
    icon: Package,
    color: 'bg-gradient-to-br from-[#E8724A] to-[#F4A261]',
    page: 'fill'
  }, {
    title: '捐赠记录',
    desc: '查看所有捐赠记录',
    icon: ClipboardList,
    color: 'bg-gradient-to-br from-[#2D6A4F] to-[#52B788]',
    page: 'records'
  }, {
    title: '统计看板',
    desc: '多维度物资统计',
    icon: BarChart3,
    color: 'bg-gradient-to-br from-[#1B1B2F] to-[#3D3D6B]',
    page: 'statistics'
  }, {
    title: '类目管理',
    desc: '管理物资类目',
    icon: Tags,
    color: 'bg-gradient-to-br from-[#D4A373] to-[#F4A261]',
    page: 'categories'
  }];
  return <div className="min-h-screen bg-[#FFF8F0]">
      <NavBar title="爱心物资统计" $w={$w} />

      {/* Header Section */}
      <div className="mx-4 mt-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E8724A] to-[#F4A261] flex items-center justify-center shadow-lg">
            <Heart size={20} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-[#1B1B2F]">弘义君物资统计助手</h1>
            <p className="text-xs text-gray-500 font-sans mt-0.5">广西 · 2026年7月</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 font-sans leading-relaxed ml-[52px]">
          感谢每一位志愿者的爱心捐赠，广西加油！
        </p>
      </div>

      {/* Menu Grid */}
      <div className="mx-4">
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item, index) => {
          const Icon = item.icon;
          return <button key={item.page} onClick={() => navigate(item.page)} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 text-left group">
                <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-serif font-semibold text-base text-[#1B1B2F]">{item.title}</h3>
                <p className="text-xs text-gray-400 font-sans mt-1.5">{item.desc}</p>
              </button>;
        })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-12 pb-8">
        <p className="text-xs text-gray-300 font-sans">众志成城，侠心见义。</p>
      </div>
    </div>;
}