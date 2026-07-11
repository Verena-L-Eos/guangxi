// @ts-ignore;
import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore;
import { Package, Plus, Minus, Send, AlertCircle, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function FillPage(props) {
  const {
    $w
  } = props;
  const [categories, setCategories] = useState([]);
  const [selectedMain, setSelectedMain] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [form, setForm] = useState({
    quantity: 1,
    price: '',
    trackingNumber: '',
    deliveryStatus: '待发货',
    estimatedArrival: '',
    donor: '',
    itemName: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const allSelected = selectedMain && selectedSub && selectedSpec;
  useEffect(() => {
    loadCategories();
  }, []);
  const loadCategories = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('categories').get();
      setCategories(res.data || []);
    } catch (e) {
      console.error('Load categories error:', e);
    } finally {
      setLoading(false);
    }
  };
  const mainCategories = [...new Set(categories.map(c => c.mainCategory))];
  const subCategories = selectedMain ? [...new Set(categories.filter(c => c.mainCategory === selectedMain).map(c => c.subCategory))] : [];
  const specs = selectedSub ? categories.filter(c => c.mainCategory === selectedMain && c.subCategory === selectedSub).map(c => c.spec) : [];
  const resetSelections = () => {
    setSelectedMain('');
    setSelectedSub('');
    setSelectedSpec('');
  };
  const resetForm = () => {
    setForm({
      quantity: 1,
      price: '',
      trackingNumber: '',
      deliveryStatus: '待发货',
      estimatedArrival: '',
      donor: '',
      itemName: '',
      note: ''
    });
  };
  const handleSubmit = async () => {
    if (!allSelected) {
      alert('请选择完整的物资类目');
      return;
    }
    if (!form.donor.trim()) {
      alert('请填写捐赠人');
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      alert('请填写有效的价格');
      return;
    }
    if (form.quantity < 1) {
      alert('数量至少为1');
      return;
    }
    setSubmitting(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const userId = $w?.auth?.currentUser?.userId || '';
      await db.collection('reports').add({
        _openid: userId,
        category: {
          mainCategory: selectedMain,
          subCategory: selectedSub,
          spec: selectedSpec
        },
        itemName: form.itemName.trim(),
        quantity: form.quantity,
        price: parseFloat(form.price),
        trackingNumber: form.trackingNumber.trim(),
        deliveryStatus: form.deliveryStatus,
        estimatedArrival: form.estimatedArrival,
        donor: form.donor.trim(),
        note: form.note.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('物资登记成功！感谢您的爱心捐赠 ❤️');
      resetForm();
      resetSelections();
    } catch (e) {
      console.error('Submit error:', e);
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };
  const handleBack = () => {
    $w.utils.navigateBack();
  };
  if (loading) {
    return <div className="min-h-screen">
        <NavBar title="物资填报" showBack onBack={handleBack} $w={$w} />
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-[#E8724A]" />
        </div>
      </div>;
  }
  return <div className="min-h-screen pb-8 bg-[#FFF8F0]">
      <NavBar title="物资填报" showBack onBack={handleBack} $w={$w} />

      <div className="mx-4 mt-4 space-y-4">
        {/* Category Selection - always visible */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2">
            <Package size={18} className="text-[#E8724A]" />
            选择物资类目
            {allSelected && <span className="ml-auto text-xs font-sans font-normal text-[#2D6A4F] flex items-center gap-1">
                <CheckCircle2 size={14} />
                已选完
              </span>}
          </h3>

          {/* Main category - 大类 */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2 font-sans">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8724A] inline-block" />
                大类
              </span>
            </label>
            {mainCategories.length === 0 ? <p className="text-sm text-gray-400 font-sans">暂无类目，请联系管理员添加</p> : <div className="flex flex-wrap gap-2">
                {mainCategories.map(cat => <button key={cat} onClick={() => {
              setSelectedMain(cat);
              setSelectedSub('');
              setSelectedSpec('');
            }} className={`px-4 py-2 rounded-full text-sm font-sans transition-all duration-200 ${selectedMain === cat ? 'bg-[#E8724A] text-white shadow-[0_2px_8px_rgba(232,114,74,0.3)]' : 'bg-[#FFF0E6] text-gray-700 hover:bg-[#FFE8D6]'}`}>
                    {cat}
                    {selectedMain === cat && <span className="ml-1.5">✓</span>}
                  </button>)}
              </div>}
          </div>

          {/* Sub category / Name - 小类/名称 */}
          {selectedMain && <div className="mb-4 animate-[fadeInUp_0.3s_ease-out]">
              <label className="block text-xs font-medium text-gray-500 mb-2 font-sans">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] inline-block" />
                  小类 / 名称
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {subCategories.map(cat => <button key={cat} onClick={() => {
              setSelectedSub(cat);
              setSelectedSpec('');
            }} className={`px-4 py-2 rounded-full text-sm font-sans transition-all duration-200 ${selectedSub === cat ? 'bg-[#2D6A4F] text-white shadow-[0_2px_8px_rgba(45,106,79,0.3)]' : 'bg-[#E8F5E9] text-gray-700 hover:bg-[#D4EDDA]'}`}>
                    {cat}
                    {selectedSub === cat && <span className="ml-1.5">✓</span>}
                  </button>)}
              </div>
            </div>}

          {/* Spec - 规格 */}
          {selectedSub && <div className="animate-[fadeInUp_0.3s_ease-out]">
              <label className="block text-xs font-medium text-gray-500 mb-2 font-sans">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F4A261] inline-block" />
                  规格
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {specs.map(spec => <button key={spec} onClick={() => setSelectedSpec(spec)} className={`px-4 py-2 rounded-full text-sm font-sans transition-all duration-200 ${selectedSpec === spec ? 'bg-amber-500 text-white shadow-[0_2px_8px_rgba(244,162,97,0.3)]' : 'bg-[#FFF8E1] text-gray-700 hover:bg-[#FFECB3]'}`}>
                    {spec}
                    {selectedSpec === spec && <span className="ml-1.5">✓</span>}
                  </button>)}
              </div>
            </div>}

          {/* Selection hint when not yet complete */}
          {!allSelected && <div className="mt-4 pt-3 border-t border-[#F0E6D8]">
              <p className="text-xs text-gray-400 font-sans flex items-center gap-1.5">
                <ChevronDown size={14} className="text-[#F4A261]" />
                {!selectedMain ? '请先选择大类' : !selectedSub ? '请继续选择小类/名称' : '请继续选择规格'}
              </p>
            </div>}
        </div>

        {/* Full Form - only shown after ALL categories selected */}
        {allSelected && <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] animate-[fadeInUp_0.4s_ease-out]">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#E8724A] inline-block" />
              填报详情
              <span className="text-xs font-sans font-normal text-gray-400 ml-auto">
                已选: {selectedMain} / {selectedSub} / {selectedSpec}
              </span>
            </h3>

            <div className="space-y-4">
              {/* Donor */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">
                  捐赠人 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.donor} onChange={e => setForm({
              ...form,
              donor: e.target.value
            })} placeholder="请输入捐赠人姓名" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* Item Name / Brand - 选填 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">
                  名称 / 品牌 <span className="text-gray-300">（选填）</span>
                </label>
                <input type="text" value={form.itemName} onChange={e => setForm({
              ...form,
              itemName: e.target.value
            })} placeholder="如：金龙鱼大米、康师傅方便面等" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">
                  数量（件） <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm({
                ...form,
                quantity: Math.max(1, form.quantity - 1)
              })} className="w-10 h-10 rounded-xl border border-[#F0E6D8] flex items-center justify-center hover:bg-[#FFF0E6] transition-all">
                    <Minus size={16} className="text-gray-600" />
                  </button>
                  <input type="number" value={form.quantity} onChange={e => setForm({
                ...form,
                quantity: Math.max(1, parseInt(e.target.value) || 1)
              })} className="w-20 text-center px-3 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans font-bold focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
                  <button onClick={() => setForm({
                ...form,
                quantity: form.quantity + 1
              })} className="w-10 h-10 rounded-xl border border-[#F0E6D8] flex items-center justify-center hover:bg-[#FFF0E6] transition-all">
                    <Plus size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">
                  单价（元）<span className="text-red-400">*</span>
                </label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({
              ...form,
              price: e.target.value
            })} placeholder="请输入单价" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">快递单号</label>
                <input type="text" value={form.trackingNumber} onChange={e => setForm({
              ...form,
              trackingNumber: e.target.value
            })} placeholder="请输入快递单号（选填）" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* Delivery Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">快递签收状态</label>
                <div className="flex gap-2">
                  {['待发货', '已发货', '已签收'].map(status => <button key={status} type="button" onClick={() => setForm({
                ...form,
                deliveryStatus: status
              })} className={`px-4 py-2 rounded-full text-sm font-sans transition-all ${form.deliveryStatus === status ? 'bg-[#2D6A4F] text-white shadow-[0_2px_8px_rgba(45,106,79,0.3)]' : 'bg-[#E8F5E9] text-gray-600 hover:bg-[#D4EDDA]'}`}>
                      {status === '待发货' && '📦 '}
                      {status === '已发货' && '🚚 '}
                      {status === '已签收' && '✅ '}
                      {status}
                    </button>)}
                </div>
              </div>

              {/* Estimated Arrival */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">预计到达时间</label>
                <input type="date" value={form.estimatedArrival} onChange={e => setForm({
              ...form,
              estimatedArrival: e.target.value
            })} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">备注/其他</label>
                <textarea value={form.note} onChange={e => setForm({
              ...form,
              note: e.target.value
            })} placeholder="其他需要说明的信息（选填）" rows={3} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all resize-none" />
              </div>
            </div>
          </div>}

        {/* Submit Button - only after full selection */}
        {allSelected && <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white font-serif font-semibold text-base shadow-[0_4px_14px_rgba(232,114,74,0.35)] hover:shadow-[0_6px_20px_rgba(232,114,74,0.4)] transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 animate-[fadeInUp_0.4s_ease-out]">
            {submitting ? <>
                <Loader2 size={20} className="animate-spin" />
                提交中...
              </> : <>
                <Send size={18} />
                提交捐赠信息
              </>}
          </button>}
      </div>
    </div>;
}