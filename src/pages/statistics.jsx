// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Package, TrendingUp, Truck, Users, DollarSign, AlertCircle, Loader2, ChevronRight, Search, X, Eye, ChevronDown, ClipboardList, Hash, Download, ArrowUpDown, ArrowUp, ArrowDown, Plus, Edit3, Filter } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export default function StatisticsPage(props) {
  const {
    $w
  } = props;
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedMain, setExpandedMain] = useState(null);
  const [detailSub, setDetailSub] = useState(null);
  const [detailRecords, setDetailRecords] = useState([]);
  const [sortOrder, setSortOrder] = useState({
    key: 'totalQty',
    dir: 'desc'
  });
  const [filterSecond, setFilterSecond] = useState('');
  const [filterThird, setFilterThird] = useState('');
  const [showSuggestionPicker, setShowSuggestionPicker] = useState(false);
  const [thirdCategoryOptions, setThirdCategoryOptions] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState([]);

  // 时间趋势 - 每日详情弹出
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateDetailRecords, setDateDetailRecords] = useState([]);
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const [recordsRes, categoriesRes] = await Promise.all([db.collection('reports').get(), db.collection('categories').get()]);
      let suggestionRes = {
        data: []
      };
      try {
        suggestionRes = await db.collection('suggestions').get();
      } catch (e) {
        // suggestions collection may not exist
      }
      setRecords(recordsRes.data || []);
      setCategories(categoriesRes.data || []);
      setSuggestions(suggestionRes?.data || []);
      // 构建三级分类选项（来自类目管理）
      const opts = [];
      const seen = new Set();
      (categoriesRes.data || []).forEach(c => {
        const t = c.thirdCategory || c.spec;
        if (t && !seen.has(t)) {
          seen.add(t);
          opts.push({
            name: t,
            mainCategory: c.mainCategory,
            subCategory: c.subCategory,
            unit: c.unit || ''
          });
        }
      });
      setThirdCategoryOptions(opts);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };
  const handleBack = () => {
    $w.utils.navigateBack();
  };

  // 解析实际总数（数量×件数）：数量算式如 "24*500" → 12000
  function getActualTotal(r) {
    const display = r.quantityDisplay || String(r.quantity || 0);
    const parts = String(display).split('*').map(s => parseFloat(s.trim()) || 0);
    if (parts.length === 2) return parts[0] * parts[1];
    return parts[0];
  }

  // 指标
  const totalDonations = records.length;
  const totalPackages = [...new Set(records.map(r => r.trackingNumber).filter(Boolean))].length;
  const totalQuantity = records.reduce((s, r) => s + getActualTotal(r), 0);
  const totalValue = records.reduce((s, r) => s + (r.price || 0) * getActualTotal(r), 0);
  const uniqueDonors = [...new Set(records.map(r => r.donor).filter(Boolean))].length;

  // 时间趋势
  const byDate = records.reduce((acc, r) => {
    if (!r.createdAt) return acc;
    const date = r.createdAt.split('T')[0];
    if (!acc[date]) acc[date] = {
      quantity: 0,
      value: 0,
      count: 0
    };
    acc[date].quantity += getActualTotal(r);
    acc[date].value += (r.price || 0) * getActualTotal(r);
    acc[date].count += 1;
    return acc;
  }, {});
  const timelineData = Object.entries(byDate).map(([date, data]) => ({
    date: date.slice(5),
    fullDate: date,
    quantity: data.quantity,
    value: Math.round(data.value),
    count: data.count
  })).sort((a, b) => a.date.localeCompare(b.date));

  // 类目汇总 — 扁平化：每行一个三级分类
  const mainCategories = [...new Set(categories.map(c => c.mainCategory).filter(Boolean))];
  const getFlatCategoryStats = (mainFilter = '', secondFilter = '', thirdFilter = '') => {
    const grouped = {};
    records.forEach(r => {
      const mainCat = r.category?.mainCategory;
      const subCat = r.category?.subCategory;
      const thirdCat = r.category?.thirdCategory || r.category?.spec;
      const unit = r.unit || '';
      if (!mainCat || !subCat || !thirdCat) return;
      if (mainFilter && mainCat !== mainFilter) return;
      if (secondFilter && subCat !== secondFilter) return;
      if (thirdFilter && thirdCat !== thirdFilter) return;
      const key = `${mainCat}||${subCat}||${thirdCat}||${unit}`;
      if (!grouped[key]) grouped[key] = {
        mainCategory: mainCat,
        subCategory: subCat,
        thirdCategory: thirdCat,
        unit,
        totalQty: 0,
        records: []
      };
      grouped[key].totalQty += getActualTotal(r);
      grouped[key].records.push(r);
    });
    return Object.values(grouped).sort((a, b) => sortOrder.dir === 'desc' ? b.totalQty - a.totalQty : a.totalQty - b.totalQty);
  };
  const flatStats = getFlatCategoryStats(expandedMain, filterSecond, filterThird);
  const allSecond = expandedMain ? [...new Set(categories.filter(c => c.mainCategory === expandedMain).map(c => c.subCategory).filter(Boolean))] : [];
  const allThirdSet = {};
  if (expandedMain && filterSecond) {
    categories.filter(c => c.mainCategory === expandedMain && c.subCategory === filterSecond).forEach(c => {
      const name = c.thirdCategory || c.spec;
      if (name) allThirdSet[name] = true;
    });
  }
  const allThird = Object.keys(allThirdSet);
  const showSubDetail = (mainCat, subCat) => {
    const filtered = records.filter(r => r.category?.mainCategory === mainCat && r.category?.subCategory === subCat).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setDetailSub({
      mainCategory: mainCat,
      subCategory: subCat
    });
    setDetailRecords(filtered);
  };

  // 查看每日详情 —— 按建议捐赠类别过滤
  const showDayDetailModal = dateStr => {
    const dayRecords = records.filter(r => r.createdAt && r.createdAt.startsWith(dateStr));
    const suggestionNames = suggestions.map(s => s.content);
    const filtered = suggestionNames.length > 0 ? dayRecords.filter(r => suggestionNames.includes(r.category?.thirdCategory || r.category?.spec)) : dayRecords;
    // 按三级分类+单位分组
    const grouped = {};
    filtered.forEach(r => {
      const key = r.category?.thirdCategory || r.category?.spec || '其他';
      if (!grouped[key]) grouped[key] = {
        name: key,
        items: []
      };
      grouped[key].items.push(r);
    });
    setDateDetailRecords(Object.values(grouped));
    setSelectedDate(dateStr);
    setShowDayDetail(true);
  };

  // 导出
  const exportCSV = (data, filename) => {
    const headers = ['大类', '二级分类', '三级分类', '数量', '单位', '单价', '总价', '捐赠人', '快递单号', '签收', '预计到达', '登记时间', '备注'];
    const rows = data.map(r => [r.category?.mainCategory || '', r.category?.subCategory || '', r.category?.thirdCategory || r.category?.spec || '', getActualTotal(r), r.unit || '', r.price || 0, ((r.price || 0) * getActualTotal(r)).toFixed(0), r.donor || '', r.trackingNumber || '', r.deliveryStatus || '', r.estimatedArrival ? r.estimatedArrival.slice(0, 10) : '', r.createdAt ? r.createdAt.slice(0, 10) : '', r.remark || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const exportAll = () => exportCSV(records, `全部捐赠_${new Date().toISOString().slice(0, 10)}`);
  const exportByCategory = (mainCat, secondCat, thirdCat) => {
    const filtered = records.filter(r => r.category?.mainCategory === mainCat && (!secondCat || r.category?.subCategory === secondCat) && (!thirdCat || (r.category?.thirdCategory || r.category?.spec) === thirdCat));
    const suffix = thirdCat ? `_${thirdCat}` : secondCat ? `_${secondCat}` : `_${mainCat}`;
    exportCSV(filtered, `捐赠导出${suffix}_${new Date().toISOString().slice(0, 10)}`);
  };
  // 导出当前分类统计表（导出的是统计表展示的数据，即 flatStats）
  const exportFlatStatsCSV = () => {
    if (flatStats.length === 0) return;
    const headers = ['大类', '二级分类', '三级分类', '统计总数', '单位'];
    const rows = flatStats.map(r => [r.mainCategory, r.subCategory, r.thirdCategory, r.totalQty, r.unit]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `类目统计_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 建议捐赠类别 —— 管理员从类目管理的三级分类中选择
  const handleToggleSuggestion = async opt => {
    const exists = suggestions.find(s => s.content === opt.name);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      if (exists) {
        await db.collection('suggestions').doc(exists._id).remove();
      } else {
        await db.collection('suggestions').add({
          content: opt.name,
          mainCategory: opt.mainCategory,
          subCategory: opt.subCategory,
          unit: opt.unit,
          createdAt: new Date().toISOString(),
          createdBy: $w?.auth?.currentUser?.userId || ''
        }).catch(() => {
          throw new Error('suggestions_collection_missing');
        });
      }
      const res = await db.collection('suggestions').get();
      setSuggestions(res.data || []);
    } catch (e) {
      if (e.message === 'suggestions_collection_missing') {
        alert('建议捐赠类别功能暂未开放，请联系管理员创建数据集合');
      } else {
        console.error('Toggle suggestion error:', e);
        alert('操作失败');
      }
    }
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
        <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#E8724A]" /></div>
      </div>;
  }
  return <div className="min-h-screen pb-8 bg-[#FFF8F0]">
      <NavBar title="统计看板" showBack onBack={handleBack} $w={$w} />

      {/* Tabs */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl p-1 shadow-card flex">
          {tabs.map(tab => {
          const Icon = tab.icon;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-sans transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={14} /> {tab.label}
              </button>;
        })}
        </div>
      </div>

      {/* ======= 总览 Tab ======= */}
      {activeTab === 'overview' && <div className="mx-4 mt-4 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFE8D6] to-[#FFD6B0] flex items-center justify-center"><Users size={22} className="text-[#E8724A]" /></div>
            <div><p className="text-2xl font-bold font-serif text-[#1B1B2F]">{uniqueDonors}</p><p className="text-xs text-gray-500 font-sans">捐赠人数</p></div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-semibold text-[#1B1B2F] flex items-center gap-2"><Eye size={16} className="text-[#2D6A4F]" /> 全部捐赠明细 <span className="text-xs font-sans font-normal text-gray-400">{records.length}条</span></h3>
              {isAdmin && <button onClick={exportAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E8724A] text-white text-xs font-sans hover:bg-[#D4633F] transition-all shadow-sm"><Download size={14} /> 导出全部</button>}
            </div>
            {records.length > 0 ? <div className="max-h-[600px] overflow-auto">
                <div className="flex items-center text-[10px] text-gray-400 font-sans py-2 border-b border-[#F0E6D8] sticky top-0 bg-white min-w-[1260px]">
                  <span className="w-[100px] pl-1">大类</span>
                  <span className="w-[100px]">二级分类</span>
                  <span className="w-[120px]">三级分类</span>
                  <span className="w-[60px] text-center">件数</span>
                  <span className="w-[60px] text-center">数量</span>
                  <span className="w-[60px] text-center">单位</span>
                  <span className="w-[70px] text-center">单价</span>
                  <span className="w-[80px] text-center">总价</span>
                  <span className="w-[130px] text-center">快递单号</span>
                  <span className="w-[80px] text-center">签收</span>
                  <span className="w-[110px] text-center">预计到达</span>
                  <span className="w-[90px] text-center">捐赠人</span>
                  <span className="w-[90px] text-center">登记时间</span>
                  <span className="w-[140px] text-center">备注</span>
                </div>
                <div className="min-w-[1260px]">
                  {[...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((r, idx) => <div key={r._id || idx} className="flex items-start py-2.5 border-b border-[#F0E6D8]/50 hover:bg-[#FFF8F0] transition-colors text-sm">
                      <span className="w-[100px] text-gray-700 text-[11px] truncate pl-1">{r.category?.mainCategory || '-'}</span>
                      <span className="w-[100px] text-gray-600 text-[11px] truncate">{r.category?.subCategory || '-'}</span>
                      <span className="w-[120px] text-gray-500 text-[10px] truncate">{r.category?.thirdCategory || r.category?.spec || '-'}</span>
                      <span className="w-[60px] text-center text-gray-700 text-[11px]">{r.pieces || r.quantity || 0}</span>
                      <span className="w-[60px] text-center font-semibold text-[#E8724A] text-[11px]">{getActualTotal(r)}</span>
                      <span className="w-[60px] text-center text-gray-500 text-[10px]">{r.unit || '-'}</span>
                      <span className="w-[70px] text-center text-gray-500 text-[10px]">¥{r.price || 0}</span>
                      <span className="w-[80px] text-center text-gray-700 text-[11px] font-medium">¥{((r.price || 0) * (r.pieces || r.quantity || 0)).toFixed(0)}</span>
                      <span className="w-[130px] text-center text-gray-400 text-[9px] truncate" title={r.trackingNumber}>{r.trackingNumber || '-'}</span>
                      <span className="w-[80px] text-center"><span className={`inline-block text-[10px] px-1 py-0.5 rounded-full font-sans ${r.deliveryStatus === '已签收' ? 'bg-green-50 text-green-700' : r.deliveryStatus === '已发货' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>{r.deliveryStatus || '待发货'}</span></span>
                      <span className="w-[110px] text-center text-gray-400 text-[10px]">{r.estimatedArrival ? r.estimatedArrival.slice(5) : '-'}</span>
                      <span className="w-[90px] text-center text-[#1B1B2F] text-[11px] font-medium truncate">{r.donor || '-'}</span>
                      <span className="w-[90px] text-center text-gray-400 text-[10px]">{r.createdAt ? r.createdAt.slice(0, 10) : '-'}</span>
                      <span className="w-[140px] text-center text-gray-400 text-[10px] truncate" title={r.remark}>{r.remark || '-'}</span>
                    </div>)}
                </div>
              </div> : <p className="text-center text-gray-400 py-6 text-sm">暂无捐赠记录</p>}
          </div>
        </div>}

      {/* ======= 类目汇总 Tab ======= */}
      {activeTab === 'category' && <div className="mx-4 mt-4 space-y-4">
          {/* 筛选 */}
          {mainCategories.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-card">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-sans mb-3"><Filter size={14} /> 筛选</div>
              <div className="flex flex-wrap gap-2">
                <select value={expandedMain || ''} onChange={e => {
            setExpandedMain(e.target.value || null);
            setFilterSecond('');
            setFilterThird('');
          }} className="px-3 py-2 rounded-xl border border-[#F0E6D8] bg-white text-sm font-sans">
                  <option value="">全部大类</option>
                  {mainCategories.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {expandedMain && <select value={filterSecond} onChange={e => setFilterSecond(e.target.value)} className="px-3 py-2 rounded-xl border border-[#F0E6D8] bg-white text-sm font-sans">
                    <option value="">全部二级分类</option>
                    {[...new Set(categories.filter(c => c.mainCategory === expandedMain).map(c => c.subCategory))].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>}
                {expandedMain && filterSecond && <select value={filterThird} onChange={e => setFilterThird(e.target.value)} className="px-3 py-2 rounded-xl border border-[#F0E6D8] bg-white text-sm font-sans">
                    <option value="">全部三级分类</option>
                    {categories.filter(c => c.mainCategory === expandedMain && c.subCategory === filterSecond).map(c => {
              const name = c.thirdCategory || c.spec;
              return <option key={c._id} value={name}>{name}</option>;
            })}
                  </select>}
              </div>
            </div>}

          {mainCategories.length === 0 ? <div className="bg-white rounded-2xl p-8 text-center shadow-card"><Package size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-400 text-sm font-sans">暂无类目数据</p></div> : <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#FFE8D6] to-[#FFD6B0]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center"><Package size={18} className="text-[#E8724A]" /></div>
                    <div>
                      <p className="font-serif font-semibold text-[#1B1B2F]">类目统计表</p>
                      <p className="text-xs text-gray-500 font-sans">{flatStats.length} 条记录</p>
                    </div>
                  </div>
                  {isAdmin && <button onClick={exportFlatStatsCSV} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-xs text-gray-600 font-sans hover:bg-gray-50 shadow-sm"><Download size={12} /> 导出统计表</button>}
                </div>
                <div className="px-5 pt-4 pb-4">
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* 表头：大类 | 二级分类 | 三级分类 | 统计总数 | 单位 | 操作(查看/导出) */}
                      <div className="flex items-center text-xs text-gray-400 font-sans py-2 border-b border-[#F0E6D8]">
                        <span className="w-[130px]">大类</span>
                        <span className="w-[130px]">二级分类</span>
                        <span className="w-[160px]">三级分类</span>
                        <span className="w-[110px] text-center flex items-center justify-center gap-1 cursor-pointer" onClick={() => setSortOrder(p => ({
                  key: 'totalQty',
                  dir: p.dir === 'desc' ? 'asc' : 'desc'
                }))}>
                          统计总数 {sortOrder.dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        </span>
                        <span className="w-[70px] text-center">单位</span>
                        <span className="w-[100px] text-center">查看</span>
                        {isAdmin && <span className="w-[100px] text-center">导出</span>}
                      </div>
                      {/* 数据行 */}
                      {flatStats.map((row, idx) => <div key={`${row.mainCategory}-${row.subCategory}-${row.thirdCategory}-${idx}`} className="flex items-center py-2.5 border-b border-[#F0E6D8]/50 hover:bg-[#FFF8F0] transition-colors text-sm">
                          <span className="w-[130px] text-gray-700 text-[11px] truncate">{row.mainCategory}</span>
                          <span className="w-[130px] text-gray-600 text-[11px] truncate">{row.subCategory}</span>
                          <span className="w-[160px] text-gray-500 text-[11px] truncate">{row.thirdCategory}</span>
                          <span className="w-[110px] text-center font-semibold text-[#E8724A] text-sm">{row.totalQty}</span>
                          <span className="w-[70px] text-center text-xs text-gray-400">{row.unit || '-'}</span>
                          <span className="w-[100px] text-center">
                            <button onClick={() => showSubDetail(row.mainCategory, row.subCategory)} className="text-[#2D6A4F] text-xs hover:underline flex items-center justify-center gap-0.5"><Eye size={11} /> 查看</button>
                          </span>
                          {isAdmin && <span className="w-[100px] text-center">
                              <button onClick={() => exportByCategory(row.mainCategory, row.subCategory, row.thirdCategory)} className="text-[#E8724A] text-xs hover:underline flex items-center justify-center gap-0.5"><Download size={11} /> 导出明细</button>
                            </span>}
                        </div>)}
                      {flatStats.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">暂无匹配的统计数据</p>}
                    </div>
                  </div>
                </div>
              </div>}
        </div>}

      {/* ======= 时间趋势 Tab ======= */}
      {activeTab === 'timeline' && <div className="mx-4 mt-4 space-y-4">
          {/* 建议捐赠类别 —— 管理员从类目管理三级分类中选择 */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-semibold text-[#1B1B2F] flex items-center gap-2"><Package size={16} className="text-[#E8724A]" /> 建议捐赠类别</h3>
              {isAdmin && <button onClick={() => setShowSuggestionPicker(!showSuggestionPicker)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E8724A] text-white text-xs font-sans hover:bg-[#D4633F]"><Plus size={12} /> {showSuggestionPicker ? '收起' : '从类目选择'}</button>}
            </div>
            {showSuggestionPicker && isAdmin && <div className="mb-3 max-h-[200px] overflow-y-auto rounded-xl border border-[#F0E6D8] p-2 space-y-1">
                {thirdCategoryOptions.length === 0 ? <p className="text-xs text-gray-400 font-sans p-2">类目管理中暂无三级分类，请先前往类目管理添加</p> : thirdCategoryOptions.map(opt => {
            const checked = suggestions.some(s => s.content === opt.name);
            return <button key={opt.name} onClick={() => handleToggleSuggestion(opt)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-sans transition-colors ${checked ? 'bg-[#FFF0E6] text-[#E8724A]' : 'hover:bg-[#FFF8F0] text-gray-700'}`}>
                      <span>{opt.name}{opt.unit ? `（${opt.unit}）` : ''}</span>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${checked ? 'bg-[#E8724A] border-[#E8724A] text-white' : 'border-gray-300'}`}>{checked ? '✓' : ''}</span>
                    </button>;
          })}
              </div>}
            {suggestions.length === 0 ? <p className="text-xs text-gray-400 font-sans">暂无建议捐赠类别，管理员可从类目管理的三级分类中选择</p> : <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => <div key={s._id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF0E6] text-sm text-gray-700 font-sans">
                      <span>📋 {s.content}{s.unit ? `（${s.unit}）` : ''}</span>
                      {isAdmin && <button onClick={() => handleToggleSuggestion({
              name: s.content,
              mainCategory: s.mainCategory,
              subCategory: s.subCategory,
              unit: s.unit
            })} className="text-gray-400 hover:text-red-500">✕</button>}
                    </div>)}
                </div>}
          </div>

          {/* 趋势图 */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-[#E8724A]" /> 捐赠数量趋势</h3>
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
            }} name="数量" />
                </LineChart>
              </ResponsiveContainer> : <p className="text-center text-gray-400 py-8 text-sm">暂无数据</p>}
          </div>

          {/* 每日捐赠明细 - 可展开 */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-3 flex items-center gap-2"><span className="w-1.5 h-5 rounded-full bg-[#2D6A4F]" /> 每日捐赠明细</h3>
            {timelineData.length > 0 ? <div className="max-h-[400px] overflow-y-auto">
                {[...timelineData].reverse().map(day => <div key={day.fullDate}>
                    <button onClick={() => setExpandedDay(expandedDay === day.fullDate ? null : day.fullDate)} className="w-full flex items-center justify-between py-2.5 border-b border-[#F0E6D8] hover:bg-[#FFF8F0] transition-colors">
                      <div className="flex items-center gap-3">
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${expandedDay === day.fullDate ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-medium text-gray-700 font-sans">{day.date}</span>
                        <span className="text-xs text-gray-400 font-sans">{day.count}次登记</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#1B1B2F]">{day.quantity}</p>
                        <p className="text-xs text-[#2D6A4F]">¥{day.value}</p>
                      </div>
                    </button>
                    {/* 展开详情 —— 按建议捐赠类别过滤显示当日统计 */}
                    {expandedDay === day.fullDate && <div className="bg-[#FFFBF5] px-4 py-3 space-y-2">
                        {(() => {
                const dayRecs = records.filter(r => r.createdAt && r.createdAt.startsWith(day.fullDate));
                // 仅展示建议捐赠类别中的三级分类
                const suggestionNames = suggestions.map(s => s.content);
                const filtered = suggestionNames.length > 0 ? dayRecs.filter(r => suggestionNames.includes(r.category?.thirdCategory || r.category?.spec)) : dayRecs;
                const grouped = {};
                filtered.forEach(r => {
                  const key = r.category?.thirdCategory || r.category?.spec || '其他';
                  const unit = r.unit || '';
                  const k = `${key}|${unit}`;
                  if (!grouped[k]) grouped[k] = {
                    name: key,
                    unit,
                    totalQty: 0,
                    count: 0
                  };
                  grouped[k].totalQty += getActualTotal(r);
                  grouped[k].count += 1;
                });
                const groups = Object.values(grouped);
                if (groups.length === 0) return <p className="text-xs text-gray-400 font-sans py-1">当日暂无建议类别的捐赠记录</p>;
                return groups.map(g => <div key={g.name} className="flex items-center justify-between py-1.5 border-b border-[#F0E6D8]/30 last:border-0 text-sm">
                              <span className="text-gray-600 font-sans">{g.name}</span>
                              <span className="text-[#1B1B2F] font-medium">{g.totalQty}{g.unit} <span className="text-xs text-gray-400">（{g.count}次）</span></span>
                            </div>);
              })()}
                        <button onClick={() => showDayDetailModal(day.fullDate)} className="text-xs text-[#E8724A] hover:underline font-sans flex items-center gap-1 mt-2"><Eye size={12} /> 查看完整详情</button>
                      </div>}
                  </div>)}
              </div> : <p className="text-center text-gray-400 py-4 text-sm">暂无数据</p>}
          </div>
        </div>}

      {/* ======= 小类详情弹窗 ======= */}
      {detailSub && <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setDetailSub(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#F0E6D8] px-5 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-sans">{detailSub.mainCategory} / {detailSub.subCategory}</p>
                  <h3 className="font-serif font-semibold text-[#1B1B2F] text-lg">{detailSub.subCategory}</h3>
                </div>
                <button onClick={() => setDetailSub(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"><X size={16} className="text-gray-500" /></button>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-1">共 {detailRecords.length} 条 · 累计 {detailRecords.reduce((s, r) => s + (r.pieces || r.quantity || 0), 0)} 件 · 总数 {detailRecords.reduce((s, r) => s + getActualTotal(r), 0)}</p>
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-5 py-3">
              {detailRecords.length === 0 ? <p className="text-center text-gray-400 py-8 text-sm">暂无记录</p> : <>
                    <div className="overflow-x-auto">
                      <div className="min-w-[900px]">
                        <div className="flex items-center text-[10px] text-gray-400 font-sans py-2 border-b border-[#F0E6D8]">
                          <span className="w-[100px] pl-1">三级分类</span>
                          <span className="w-[60px] text-center">件数</span>
                          <span className="w-[70px] text-center">数量</span>
                          <span className="w-[60px] text-center">单位</span>
                          <span className="w-[70px] text-center">单价</span>
                          <span className="w-[80px] text-center">总价</span>
                          <span className="w-[110px] text-center">快递单号</span>
                          <span className="w-[100px] text-center">捐赠人</span>
                          <span className="w-[100px] text-center">登记时间</span>
                        </div>
                        {detailRecords.map((r, idx) => <div key={r._id || idx} className="flex items-start py-2.5 border-b border-[#F0E6D8]/50 text-sm">
                            <span className="w-[100px] text-gray-500 text-[11px] truncate pl-1">{r.category?.thirdCategory || r.category?.spec || '-'}</span>
                            <span className="w-[60px] text-center text-gray-700">{r.pieces || r.quantity || 0}</span>
                            <span className="w-[70px] text-center text-[#E8724A] font-semibold text-[11px]">{getActualTotal(r)}</span>
                            <span className="w-[60px] text-center text-gray-400 text-[10px]">{r.unit || '-'}</span>
                            <span className="w-[70px] text-center text-gray-500 text-[10px]">¥{r.price || 0}</span>
                            <span className="w-[80px] text-center text-gray-700 text-[11px]">¥{((r.price || 0) * (r.pieces || r.quantity || 0)).toFixed(0)}</span>
                            <span className="w-[110px] text-center text-gray-400 text-[9px] truncate">{r.trackingNumber || '-'}</span>
                            <span className="w-[100px] text-center text-[#1B1B2F] text-[11px] truncate">{r.donor || '-'}</span>
                            <span className="w-[100px] text-center text-gray-400 text-[10px]">{r.createdAt ? r.createdAt.slice(0, 10) : '-'}</span>
                          </div>)}
                      </div>
                    </div>
                  </>}
            </div>
          </div>
        </div>}

      {/* ======= 每日详情弹窗 ======= */}
      {showDayDetail && <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDayDetail(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#F0E6D8] px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-semibold text-[#1B1B2F]">📅 {selectedDate} 捐赠明细</h3>
                <p className="text-[10px] text-gray-400 font-sans mt-0.5">按建议捐赠类别筛选</p>
                <button onClick={() => setShowDayDetail(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"><X size={16} className="text-gray-500" /></button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-5 py-3 space-y-3">
              {dateDetailRecords[0]?.items ? <>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1000px]">
                      <div className="flex items-center text-[10px] text-gray-400 font-sans py-2 border-b border-[#F0E6D8]">
                        <span className="w-[50px] text-center">序号</span>
                        <span className="w-[90px]">捐赠人</span>
                        <span className="w-[100px]">三级分类</span>
                        <span className="w-[80px] text-center">物品名称</span>
                        <span className="w-[60px] text-center">件数</span>
                        <span className="w-[60px] text-center">数量</span>
                        <span className="w-[50px] text-center">单位</span>
                        <span className="w-[70px] text-center">单价</span>
                        <span className="w-[80px] text-center">总价</span>
                        <span className="w-[120px] text-center">快递单号</span>
                        <span className="w-[90px] text-center">预计到达</span>
                      </div>
                      {dateDetailRecords.flatMap(g => g.items).map((r, idx) => <div key={r._id || idx} className="flex items-start py-2.5 border-b border-[#F0E6D8]/50 hover:bg-[#FFFBF5]">
                          <span className="w-[50px] text-center text-gray-400 text-[10px]">{idx + 1}</span>
                          <span className="w-[90px] text-[#1B1B2F] text-[11px] font-medium truncate">{r.donor || '-'}</span>
                          <span className="w-[100px] text-gray-500 text-[10px] truncate">{r.category?.thirdCategory || r.category?.spec || '-'}</span>
                          <span className="w-[80px] text-center text-gray-600 text-[10px] truncate">{r.itemName || '-'}</span>
                          <span className="w-[60px] text-center text-gray-700 text-[11px]">{r.pieces || r.quantity || 0}</span>
                          <span className="w-[60px] text-center font-semibold text-[#E8724A] text-[11px]">{getActualTotal(r)}</span>
                          <span className="w-[50px] text-center text-gray-400 text-[10px]">{r.unit || '-'}</span>
                          <span className="w-[70px] text-center text-gray-500 text-[10px]">¥{r.price || 0}</span>
                          <span className="w-[80px] text-center text-gray-700 text-[11px]">¥{((r.price || 0) * (r.pieces || r.quantity || 0)).toFixed(0)}</span>
                          <span className="w-[120px] text-center text-gray-400 text-[9px] truncate" title={r.trackingNumber}>{r.trackingNumber || '-'}</span>
                          <span className="w-[90px] text-center text-gray-400 text-[10px]">{r.estimatedArrival ? r.estimatedArrival.slice(5) : '-'}</span>
                        </div>)}
                    </div>
                  </div>
                </> : <p className="text-center text-gray-400 py-4 text-sm">暂无详细数据</p>}
            </div>
          </div>
        </div>}
    </div>;
}