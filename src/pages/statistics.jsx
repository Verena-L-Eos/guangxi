// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Package, TrendingUp, Truck, Users, DollarSign, AlertCircle, Loader2, ChevronRight, Search, X, Eye, ChevronDown, ClipboardList, Hash } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export default function StatisticsPage(props) {
  const {
    $w
  } = props;
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedMain, setExpandedMain] = useState(null);
  const [detailSub, setDetailSub] = useState(null); // { mainCategory, subCategory }
  const [detailRecords, setDetailRecords] = useState([]);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const [recordsRes, categoriesRes] = await Promise.all([db.collection('reports').get(), db.collection('categories').get()]);
      setRecords(recordsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (e) {
      console.error('Load data error:', e);
    } finally {
      setLoading(false);
    }
  };
  const handleBack = () => {
    $w.utils.navigateBack();
  };

  // === 统计指标 ===
  const totalDonations = records.length;

  // 总件数：根据快递单号统计（唯一快递单号的个数）
  const totalPackages = [...new Set(records.map(r => r.trackingNumber).filter(Boolean))].length;

  // 总物资数量（累计）
  const totalQuantity = records.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalValue = records.reduce((s, r) => s + (r.price || 0) * (r.quantity || 0), 0);
  const uniqueDonors = [...new Set(records.map(r => r.donor).filter(Boolean))].length;

  // === 时间趋势 ===
  const byDate = records.reduce((acc, r) => {
    if (!r.createdAt) return acc;
    const date = r.createdAt.split('T')[0];
    if (!acc[date]) acc[date] = {
      quantity: 0,
      value: 0,
      count: 0
    };
    acc[date].quantity += r.quantity || 0;
    acc[date].value += (r.price || 0) * (r.quantity || 0);
    acc[date].count += 1;
    return acc;
  }, {});
  const timelineData = Object.entries(byDate).map(([date, data]) => ({
    date: date.slice(5),
    quantity: data.quantity,
    value: Math.round(data.value),
    count: data.count
  })).sort((a, b) => a.date.localeCompare(b.date));

  // === 类目汇总（按大类 → 小类） ===
  // 构建大类下的小类统计
  const mainCategories = [...new Set(categories.map(c => c.mainCategory).filter(Boolean))];
  const getSubCategoryStats = mainCat => {
    const subCats = [...new Set(categories.filter(c => c.mainCategory === mainCat).map(c => c.subCategory).filter(Boolean))];
    return subCats.map(sub => {
      const subRecords = records.filter(r => r.category?.mainCategory === mainCat && r.category?.subCategory === sub);
      const totalQty = subRecords.reduce((s, r) => s + (r.quantity || 0), 0);
      const totalVal = subRecords.reduce((s, r) => s + (r.price || 0) * (r.quantity || 0), 0);
      const uniqueTrackings = [...new Set(subRecords.map(r => r.trackingNumber).filter(Boolean))].length;
      const donors = [...new Set(subRecords.map(r => r.donor).filter(Boolean))];
      const count = subRecords.length;
      return {
        name: sub,
        totalQty,
        totalVal,
        uniqueTrackings,
        donors: donors.length,
        count,
        records: subRecords
      };
    }).sort((a, b) => b.totalQty - a.totalQty);
  };
  const getMainCategoryStats = mainCat => {
    const subStats = getSubCategoryStats(mainCat);
    return {
      totalQty: subStats.reduce((s, i) => s + i.totalQty, 0),
      totalVal: subStats.reduce((s, i) => s + i.totalVal, 0),
      trackings: subStats.reduce((s, i) => s + i.uniqueTrackings, 0),
      donors: [...new Set(subStats.flatMap(s => s.donors))].length,
      count: subStats.reduce((s, i) => s + i.count, 0),
      subStats
    };
  };

  // === 查看小类详情 ===
  const showSubDetail = (mainCat, subCat) => {
    const filtered = records.filter(r => r.category?.mainCategory === mainCat && r.category?.subCategory === subCat).sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db - da;
    });
    setDetailSub({
      mainCategory: mainCat,
      subCategory: subCat
    });
    setDetailRecords(filtered);
  };
  const tabs = [{
    id: 'overview',
    label: '总览',
    icon: ClipboardList
  }, {
    id: 'category',
    label: '类目汇总',
    icon: Package
  }, {
    id: 'timeline',
    label: '时间趋势',
    icon: TrendingUp
  }];
  if (loading) {
    return <div className="min-h-screen bg-[#FFF8F0]">
        <NavBar title="统计看板" showBack onBack={handleBack} $w={$w} />
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-[#E8724A]" />
        </div>
      </div>;
  }
  return <div className="min-h-screen pb-8 bg-[#FFF8F0]">
      <NavBar title="统计看板" showBack onBack={handleBack} $w={$w} />

      {/* Tabs */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl p-1 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex">
          {tabs.map(tab => {
          const Icon = tab.icon;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-sans transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white shadow-[0_2px_8px_rgba(232,114,74,0.3)]' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={14} />
                {tab.label}
              </button>;
        })}
        </div>
      </div>

      {/* ========== 总览 Tab ========== */}
      {activeTab === 'overview' && <div className="mx-4 mt-4 space-y-4 animate-[fadeInUp_0.3s_ease-out]">
          {/* 捐赠人数 - 简洁卡片 */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFE8D6] to-[#FFD6B0] flex items-center justify-center">
              <Users size={22} className="text-[#E8724A]" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif text-[#1B1B2F]">{uniqueDonors}</p>
              <p className="text-xs text-gray-500 font-sans">捐赠人数</p>
            </div>
          </div>

          {/* 全部捐赠明细 - 完整记录列表 */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2">
              <Eye size={16} className="text-[#2D6A4F]" />
              全部捐赠明细
              <span className="ml-auto text-xs font-sans font-normal text-gray-400">{records.length}条</span>
            </h3>
            {records.length > 0 ? <div className="max-h-[600px] overflow-auto">
                {/* 表头 */}
                <div className="flex items-center text-[10px] text-gray-400 font-sans py-2 border-b border-[#F0E6D8] sticky top-0 bg-white min-w-[1060px]">
                  <span className="w-[100px] pl-1">大类</span>
                  <span className="w-[100px]">小类</span>
                  <span className="w-[120px]">名称</span>
                  <span className="w-[60px] text-center">数量</span>
                  <span className="w-[70px] text-center">单价</span>
                  <span className="w-[80px] text-center">总价</span>
                  <span className="w-[130px] text-center">快递单号</span>
                  <span className="w-[80px] text-center">签收</span>
                  <span className="w-[110px] text-center">预计到达时间</span>
                  <span className="w-[80px] text-center">捐赠人</span>
                  <span className="w-[90px] text-center">备注</span>
                </div>
                <div className="min-w-[1060px]">
                {[...records].sort((a, b) => {
              const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
              const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
              return db - da;
            }).map((r, idx) => <div key={r._id || idx} className="flex items-start py-2.5 border-b border-[#F0E6D8]/50 hover:bg-[#FFF8F0] transition-colors text-sm">
                    <span className="w-[100px] text-gray-700 text-[11px] truncate pl-1">{r.category?.mainCategory || '-'}</span>
                    <span className="w-[100px] text-gray-600 text-[11px] truncate">{r.category?.subCategory || '-'}</span>
                    <span className="w-[120px] text-gray-500 text-[10px] truncate">{r.itemName || '-'}</span>
                    <span className="w-[60px] text-center font-semibold text-[#E8724A] text-[11px]">{r.quantity || 0}</span>
                    <span className="w-[70px] text-center text-gray-500 text-[10px]">¥{r.price || 0}</span>
                    <span className="w-[80px] text-center text-gray-700 text-[11px] font-medium">¥{((r.price || 0) * (r.quantity || 0)).toFixed(0)}</span>
                    <span className="w-[130px] text-center text-gray-400 text-[9px] truncate" title={r.trackingNumber}>{r.trackingNumber || '-'}</span>
                    <span className="w-[80px] text-center">
                      <span className={`inline-block text-[10px] px-1 py-0.5 rounded-full font-sans ${r.deliveryStatus === '已签收' ? 'bg-green-50 text-green-700' : r.deliveryStatus === '已发货' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                        {r.deliveryStatus || '待发货'}
                      </span>
                    </span>
                    <span className="w-[110px] text-center text-gray-400 text-[10px]">{r.estimatedArrival ? r.estimatedArrival.slice(5) : '-'}</span>
                    <span className="w-[80px] text-center text-[#1B1B2F] text-[11px] font-medium truncate">{r.donor || '-'}</span>
                    <span className="w-[90px] text-center text-gray-400 text-[10px] truncate" title={r.note}>{r.note ? r.note.slice(0, 6) + (r.note.length > 6 ? '..' : '') : '-'}</span>
                  </div>)}
                </div>
              </div> : <p className="text-center text-gray-400 py-6 text-sm">暂无捐赠记录</p>}
          </div>
        </div>}

      {/* ========== 类目汇总 Tab ========== */}
      {activeTab === 'category' && <div className="mx-4 mt-4 space-y-4 animate-[fadeInUp_0.3s_ease-out]">
          {mainCategories.length === 0 ? <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <Package size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm font-sans">暂无类目数据</p>
            </div> : mainCategories.map(mainCat => {
        const stats = getMainCategoryStats(mainCat);
        const isExpanded = expandedMain === mainCat;
        return <div key={mainCat} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
                  {/* 大类头部 */}
                  <button onClick={() => setExpandedMain(isExpanded ? null : mainCat)} className="w-full flex items-center justify-between p-5 hover:bg-[#FFF8F0] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE8D6] to-[#FFD6B0] flex items-center justify-center">
                        <Package size={18} className="text-[#E8724A]" />
                      </div>
                      <div className="text-left">
                        <p className="font-serif font-semibold text-[#1B1B2F]">{mainCat}</p>
                        <p className="text-xs text-gray-400 font-sans">
                          {stats.count}次捐赠 · 累计{stats.totalQty}件 · {stats.donors}人
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 小类列表（展开时） */}
                  {isExpanded && <div className="px-5 pb-4 border-t border-[#F0E6D8]">
                      {stats.subStats.length === 0 ? <p className="text-gray-400 text-sm py-3 text-center font-sans">暂无捐赠记录</p> : <div className="space-y-0 mt-3">
                          {/* 小类表头 */}
                          <div className="flex items-center text-xs text-gray-400 font-sans py-2 px-1">
                            <span className="flex-1">小类 / 名称</span>
                            <span className="w-14 text-center">捐赠次数</span>
                            <span className="w-16 text-center">累计件数</span>
                            <span className="w-14 text-center">包裹数</span>
                            <span className="w-16 text-right">总价值</span>
                          </div>
                          {/* 小类列表 */}
                          {stats.subStats.map(sub => <button key={sub.name} onClick={() => showSubDetail(mainCat, sub.name)} className="w-full flex items-center py-2.5 px-1 border-b border-[#F0E6D8]/50 hover:bg-[#FFF8F0] transition-colors rounded-lg group">
                              <span className="flex-1 text-sm font-medium text-[#1B1B2F] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]" />
                                {sub.name}
                              </span>
                              <span className="w-14 text-center text-xs text-gray-500">{sub.count}</span>
                              <span className="w-16 text-center text-xs font-semibold text-[#E8724A]">{sub.totalQty}件</span>
                              <span className="w-14 text-center text-xs text-gray-500">{sub.uniqueTrackings}</span>
                              <span className="w-16 text-right text-xs font-medium text-[#2D6A4F]">¥{sub.totalVal.toFixed(0)}</span>
                              <ChevronRight size={14} className="ml-1 text-gray-300 group-hover:text-[#E8724A] transition-colors" />
                            </button>)}
                        </div>}
                    </div>}
                </div>;
      })}
        </div>}

      {/* ========== 时间趋势 Tab ========== */}
      {activeTab === 'timeline' && <div className="mx-4 mt-4 space-y-4 animate-[fadeInUp_0.3s_ease-out]">
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#E8724A]" />
              捐赠数量趋势
            </h3>
            {timelineData.length > 0 ? <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                  <XAxis dataKey="date" tick={{
              fontSize: 11,
              fontFamily: 'Noto Sans SC'
            }} stroke="#9CA3AF" />
                  <YAxis tick={{
              fontSize: 11
            }} stroke="#9CA3AF" />
                  <Tooltip contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontFamily: 'Noto Sans SC'
            }} />
                  <Line type="monotone" dataKey="quantity" stroke="#E8724A" strokeWidth={2} dot={{
              fill: '#E8724A',
              strokeWidth: 2
            }} activeDot={{
              r: 6,
              fill: '#E8724A'
            }} name="数量(件)" />
                </LineChart>
              </ResponsiveContainer> : <p className="text-center text-gray-400 py-8 text-sm">暂无数据</p>}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#2D6A4F]" />
              每日捐赠明细
            </h3>
            {timelineData.length > 0 ? <div className="max-h-[400px] overflow-y-auto">
                {[...timelineData].reverse().map(day => <div key={day.date} className="flex items-center justify-between py-2.5 border-b border-[#F0E6D8] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-16 font-sans">{day.date}</span>
                      <span className="text-xs text-gray-400 font-sans">{day.count}次登记</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1B1B2F]">{day.quantity}件</p>
                      <p className="text-xs text-[#2D6A4F]">¥{day.value}</p>
                    </div>
                  </div>)}
              </div> : <p className="text-center text-gray-400 py-4 text-sm">暂无数据</p>}
          </div>
        </div>}

      {/* ========== 小类详情弹窗 ========== */}
      {detailSub && <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setDetailSub(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-[fadeInUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-white border-b border-[#F0E6D8] px-5 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-sans">{detailSub.mainCategory}</p>
                  <h3 className="font-serif font-semibold text-[#1B1B2F] text-lg">{detailSub.subCategory}</h3>
                </div>
                <button onClick={() => setDetailSub(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-1">
                共 {detailRecords.length} 条捐赠记录 · 累计 {detailRecords.reduce((s, r) => s + (r.quantity || 0), 0)} 件
              </p>
            </div>

            {/* 弹窗内容 - 捐赠明细列表 */}
            <div className="overflow-y-auto max-h-[60vh] px-5 py-3">
              {detailRecords.length === 0 ? <p className="text-center text-gray-400 py-8 text-sm">暂无记录</p> : <>
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {/* 表头 - 与总览一致 */}
                      <div className="flex items-center text-[10px] text-gray-400 font-sans py-2 border-b border-[#F0E6D8]">
                        <span className="w-[100px] pl-1">大类</span>
                        <span className="w-[100px]">小类</span>
                        <span className="w-[120px]">名称</span>
                        <span className="w-[60px] text-center">数量</span>
                        <span className="w-[70px] text-center">单价</span>
                        <span className="w-[80px] text-center">总价</span>
                        <span className="w-[130px] text-center">快递单号</span>
                        <span className="w-[80px] text-center">签收</span>
                        <span className="w-[110px] text-center">预计到达时间</span>
                        <span className="w-[80px] text-center">捐赠人</span>
                        <span className="w-[90px] text-center">备注</span>
                      </div>
                      {detailRecords.map((r, idx) => <div key={r._id || idx} className="flex items-start py-2.5 border-b border-[#F0E6D8]/50 text-sm">
                          <span className="w-[100px] text-gray-700 text-[11px] truncate pl-1">{r.category?.mainCategory || '-'}</span>
                          <span className="w-[100px] text-gray-600 text-[11px] truncate">{r.category?.subCategory || '-'}</span>
                          <span className="w-[120px] text-gray-500 text-[10px] truncate">{r.itemName || '-'}</span>
                          <span className="w-[60px] text-center font-semibold text-[#E8724A] text-[11px]">{r.quantity || 0}</span>
                          <span className="w-[70px] text-center text-gray-500 text-[10px]">¥{r.price || 0}</span>
                          <span className="w-[80px] text-center text-gray-700 text-[11px] font-medium">¥{((r.price || 0) * (r.quantity || 0)).toFixed(0)}</span>
                          <span className="w-[130px] text-center text-gray-400 text-[9px] truncate" title={r.trackingNumber}>{r.trackingNumber || '-'}</span>
                          <span className="w-[80px] text-center">
                            <span className={`inline-block text-[10px] px-1 py-0.5 rounded-full font-sans ${r.deliveryStatus === '已签收' ? 'bg-green-50 text-green-700' : r.deliveryStatus === '已发货' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                              {r.deliveryStatus || '待发货'}
                            </span>
                          </span>
                          <span className="w-[110px] text-center text-gray-400 text-[10px]">{r.estimatedArrival ? r.estimatedArrival.slice(5) : '-'}</span>
                          <span className="w-[80px] text-center text-[#1B1B2F] text-[11px] font-medium truncate">{r.donor || '-'}</span>
                          <span className="w-[90px] text-center text-gray-400 text-[10px] truncate" title={r.note}>{r.note ? r.note.slice(0, 6) + (r.note.length > 6 ? '..' : '') : '-'}</span>
                        </div>)}
                    </div>
                  </div>
                </>}
            </div>
          </div>
        </div>}
    </div>;
}