// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Package, Plus, Minus, Send, AlertCircle, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function FillPage(props) {
  const {
    $w
  } = props;
  const [categories, setCategories] = useState([]);
  const [selectedMain, setSelectedMain] = useState('');
  const [selectedSecond, setSelectedSecond] = useState('');
  const [selectedThird, setSelectedThird] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [form, setForm] = useState({
    server: '',
    nickname: '',
    itemName: '',
    quantity: '',
    price: '',
    trackingNumber: '',
    deliveryStatus: '待发货',
    estimatedArrival: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const allSelected = selectedMain && selectedSecond && selectedThird;
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

  // Group: mainCategory → secondCategory → [{thirdCategory, unit}]
  const tree = {};
  categories.forEach(c => {
    const m = c.mainCategory;
    const s = c.subCategory;
    if (!tree[m]) tree[m] = {};
    if (!tree[m][s]) tree[m][s] = [];
    const name = c.thirdCategory || c.spec;
    if (name && !tree[m][s].find(x => x.name === name)) {
      tree[m][s].push({
        name,
        unit: c.unit || '',
        _id: c._id
      });
    }
  });
  const mainCats = Object.keys(tree);
  const secondCats = selectedMain ? Object.keys(tree[selectedMain] || {}) : [];
  const thirdItems = selectedSecond ? tree[selectedMain]?.[selectedSecond] || [] : [];

  // Parse quantity expression: "25*500" → { pieces: 25, perUnit: 500, total: 12500 }
  // simple "3" → { pieces: 3, perUnit: null, total: 3 }
  const parseQuantity = val => {
    if (!val.trim()) return {
      pieces: 0,
      perUnit: null,
      total: 0,
      display: ''
    };
    const parts = val.split('*').map(s => parseFloat(s.trim()) || 0);
    if (parts.length === 2) {
      return {
        pieces: parts[0],
        perUnit: parts[1],
        total: parts[0] * parts[1],
        display: `${parts[0]}*${parts[1]}`
      };
    }
    return {
      pieces: parts[0],
      perUnit: null,
      total: parts[0],
      display: `${parts[0]}`
    };
  };
  const qtyInfo = parseQuantity(form.quantity);
  const donorDisplay = form.server && form.nickname ? `${form.server} - ${form.nickname}` : '';
  const handleSubmit = async () => {
    if (!allSelected) {
      alert('请选择完整的物资类目');
      return;
    }
    if (!form.server.trim() || !form.nickname.trim()) {
      alert('请填写区服和昵称');
      return;
    }
    if (!form.quantity.trim() || qtyInfo.total <= 0) {
      alert('请填写有效数量');
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      alert('请填写有效单价');
      return;
    }
    setSubmitting(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const userId = $w?.auth?.currentUser?.userId || '';
      const selectedThirdItem = thirdItems.find(t => t.name === selectedThird);
      await db.collection('reports').add({
        _openid: userId,
        category: {
          mainCategory: selectedMain,
          subCategory: selectedSecond,
          thirdCategory: selectedThird,
          spec: selectedThird
        },
        server: form.server.trim(),
        nickname: form.nickname.trim(),
        donor: donorDisplay,
        itemName: form.itemName.trim(),
        quantity: qtyInfo.pieces,
        quantityDisplay: form.quantity.trim(),
        unit: selectedUnit,
        price: parseFloat(form.price),
        trackingNumber: form.trackingNumber.trim(),
        deliveryStatus: form.deliveryStatus,
        estimatedArrival: form.estimatedArrival,
        note: form.note.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('物资登记成功！感谢您的爱心捐赠 ❤️');
      setForm({
        server: '',
        nickname: '',
        itemName: '',
        quantity: '',
        price: '',
        trackingNumber: '',
        deliveryStatus: '待发货',
        estimatedArrival: '',
        note: ''
      });
      setSelectedMain('');
      setSelectedSecond('');
      setSelectedThird('');
      setSelectedUnit('');
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
    return <div className="min-h-screen bg-[#FFF8F0]">
        <NavBar title="物资填报" showBack onBack={handleBack} $w={$w} />
        <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#E8724A]" /></div>
      </div>;
  }
  return <div className="min-h-screen pb-8 bg-[#FFF8F0]">
      <NavBar title="物资填报" showBack onBack={handleBack} $w={$w} />

      <div className="mx-4 mt-4 space-y-4">
        {/* 类目选择 */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2">
            <Package size={18} className="text-[#E8724A]" /> 选择物资类目
            {allSelected && <span className="ml-auto text-xs font-sans font-normal text-[#2D6A4F] flex items-center gap-1"><CheckCircle2 size={14} /> 已选完</span>}
          </h3>

          {/* 大类 */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2 font-sans"><span className="w-1.5 h-1.5 rounded-full bg-[#E8724A] inline-block" /> 大类</label>
            {mainCats.length === 0 ? <p className="text-sm text-gray-400 font-sans">暂无类目，请联系管理员添加</p> : <div className="flex flex-wrap gap-2">
                  {mainCats.map(cat => <button key={cat} onClick={() => {
              setSelectedMain(cat);
              setSelectedSecond('');
              setSelectedThird('');
              setSelectedUnit('');
            }} className={`px-4 py-2 rounded-full text-sm font-sans transition-all ${selectedMain === cat ? 'bg-[#E8724A] text-white shadow-md' : 'bg-[#FFF0E6] text-gray-700 hover:bg-[#FFE8D6]'}`}>
                      {cat} {selectedMain === cat && '✓'}
                    </button>)}
                </div>}
          </div>

          {/* 二级分类 */}
          {selectedMain && <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2 font-sans"><span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] inline-block" /> 二级分类</label>
              <div className="flex flex-wrap gap-2">
                {secondCats.map(cat => <button key={cat} onClick={() => {
              setSelectedSecond(cat);
              setSelectedThird('');
              setSelectedUnit('');
            }} className={`px-4 py-2 rounded-full text-sm font-sans transition-all ${selectedSecond === cat ? 'bg-[#2D6A4F] text-white shadow-md' : 'bg-[#E8F5E9] text-gray-700 hover:bg-[#D4EDDA]'}`}>
                    {cat} {selectedSecond === cat && '✓'}
                  </button>)}
              </div>
            </div>}

          {/* 三级分类 */}
          {selectedSecond && <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2 font-sans"><span className="w-1.5 h-1.5 rounded-full bg-[#F4A261] inline-block" /> 三级分类</label>
              <div className="flex flex-wrap gap-2">
                {thirdItems.map(item => <button key={item.name} onClick={() => {
              setSelectedThird(item.name);
              setSelectedUnit(item.unit || '');
            }} className={`px-4 py-2 rounded-full text-sm font-sans transition-all ${selectedThird === item.name ? 'bg-amber-500 text-white shadow-md' : 'bg-[#FFF8E1] text-gray-700 hover:bg-[#FFECB3]'}`}>
                    {item.name} {selectedThird === item.name && '✓'}
                  </button>)}
              </div>
              {selectedUnit && <p className="mt-2 text-xs text-gray-400 font-sans">单位：<span className="font-mono font-semibold text-[#E8724A]">{selectedUnit}</span></p>}
            </div>}

          {!allSelected && <div className="mt-4 pt-3 border-t border-[#F0E6D8]">
              <p className="text-xs text-gray-400 font-sans flex items-center gap-1.5"><ChevronDown size={14} className="text-[#F4A261]" /> {!selectedMain ? '请先选择大类' : !selectedSecond ? '请继续选择二级分类' : '请继续选择三级分类'}</p>
            </div>}
        </div>

        {/* 填报详情 */}
        {allSelected && <div className="bg-white rounded-2xl p-5 shadow-card">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#E8724A] inline-block" /> 填报详情
              <span className="text-xs font-sans font-normal text-gray-400 ml-auto">已选: {selectedMain} / {selectedSecond} / {selectedThird}</span>
            </h3>

            <div className="space-y-4">
              {/* 区服 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">区服 <span className="text-red-400">*</span></label>
                <input type="text" value={form.server} onChange={e => setForm({
              ...form,
              server: e.target.value
            })} placeholder="例如：唯满侠、梦江南" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* 昵称 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">昵称 <span className="text-red-400">*</span></label>
                <input type="text" value={form.nickname} onChange={e => setForm({
              ...form,
              nickname: e.target.value
            })} placeholder="游戏角色昵称" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
                {donorDisplay && <p className="text-xs text-[#E8724A] mt-1 font-sans">捐赠人：{donorDisplay}</p>}
              </div>

              {/* 捐赠物品名称 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">捐赠物品名称 <span className="text-gray-300">（选填）</span></label>
                <input type="text" value={form.itemName} onChange={e => setForm({
              ...form,
              itemName: e.target.value
            })} placeholder="如：金龙鱼大米、康师傅方便面" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* 数量 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">数量 <span className="text-red-400">*</span> <span className="text-gray-300 font-normal">（支持算式如 "24*500"）</span></label>
                <div className="flex items-center gap-2">
                  <input type="text" value={form.quantity} onChange={e => setForm({
                ...form,
                quantity: e.target.value
              })} placeholder="例如：3 或 24*500" className="flex-1 px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
                  {selectedUnit && <span className="text-base font-mono font-bold text-[#E8724A] bg-[#FFF0E6] px-3 py-3 rounded-xl">{selectedUnit}</span>}
                </div>
                {form.quantity.trim() && qtyInfo.total > 0 && <p className="text-xs text-gray-500 mt-1 font-sans">
                    统计总数：<span className="font-semibold text-[#1B1B2F]">{qtyInfo.total}</span> {selectedUnit}
                    {qtyInfo.perUnit && <span>（{qtyInfo.pieces}件 × {qtyInfo.perUnit}{selectedUnit}/件）</span>}
                  </p>}
              </div>

              {/* 件数 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">件数 <span className="text-red-400">*</span></label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm({
                ...form,
                quantity: String(Math.max(1, (parseInt(form.quantity) || 1) - 1))
              })} className="w-10 h-10 rounded-xl border border-[#F0E6D8] flex items-center justify-center hover:bg-[#FFF0E6]"><Minus size={16} className="text-gray-600" /></button>
                  <input type="number" value={qtyInfo.pieces} onChange={e => {
                const val = e.target.value;
                const pieces = Math.max(1, parseInt(val) || 1);
                if (qtyInfo.perUnit) {
                  setForm({
                    ...form,
                    quantity: `${pieces}*${qtyInfo.perUnit}`
                  });
                } else {
                  setForm({
                    ...form,
                    quantity: String(pieces)
                  });
                }
              }} className="w-20 text-center px-3 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans font-bold focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A]" />
                  <button onClick={() => {
                const pieces = qtyInfo.pieces + 1;
                if (qtyInfo.perUnit) {
                  setForm({
                    ...form,
                    quantity: `${pieces}*${qtyInfo.perUnit}`
                  });
                } else {
                  setForm({
                    ...form,
                    quantity: String(pieces)
                  });
                }
              }} className="w-10 h-10 rounded-xl border border-[#F0E6D8] flex items-center justify-center hover:bg-[#FFF0E6]"><Plus size={16} className="text-gray-600" /></button>
                </div>
              </div>

              {/* 单价 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">单价（元）<span className="text-red-400">*</span></label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({
              ...form,
              price: e.target.value
            })} placeholder="请输入单价" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* 快递单号 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">快递单号</label>
                <input type="text" value={form.trackingNumber} onChange={e => setForm({
              ...form,
              trackingNumber: e.target.value
            })} placeholder="请输入快递单号（选填）" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* 预计到达时间 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">预计到达时间</label>
                <input type="date" value={form.estimatedArrival} onChange={e => setForm({
              ...form,
              estimatedArrival: e.target.value
            })} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">备注/其他</label>
                <textarea value={form.note} onChange={e => setForm({
              ...form,
              note: e.target.value
            })} placeholder="其他需要说明的信息（选填）" rows={3} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all resize-none" />
              </div>
            </div>
          </div>}

        {allSelected && <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white font-serif font-semibold text-base shadow-button hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={20} className="animate-spin" /> 提交中...</> : <><Send size={18} /> 提交捐赠信息</>}
          </button>}
      </div>
    </div>;
}