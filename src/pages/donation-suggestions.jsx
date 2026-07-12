// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Plus, Edit3, Trash2, X, Save, AlertCircle, Loader2, ChevronDown, Package } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function DonationSuggestionsPage(props) {
  const {
    $w
  } = props;
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Selection state for the dropdown cascade
  const [selectedMain, setSelectedMain] = useState('');
  const [selectedSecond, setSelectedSecond] = useState('');
  const [selectedThird, setSelectedThird] = useState('');
  useEffect(() => {
    Promise.all([loadSuggestions(), loadCategories()]);
  }, []);

  // —— Data Loading ——
  const loadCategories = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('categories').get();
      setCategories(res.data || []);
    } catch (e) {
      console.error('Load categories error:', e);
    }
  };
  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('suggestions').get();
      setSuggestions(res.data || []);
    } catch (e) {
      console.error('Load suggestions error:', e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Build tree from categories
  const mainSet = [...new Set(categories.map(c => c.mainCategory).filter(Boolean))];
  const getSecond = main => [...new Set(categories.filter(c => c.mainCategory === main).map(c => c.subCategory).filter(Boolean))];
  const getThird = (main, second) => {
    const items = categories.filter(c => c.mainCategory === main && c.subCategory === second);
    const names = new Set();
    items.forEach(c => {
      const name = c.thirdCategory || c.spec || '';
      if (name) names.add(name);
    });
    return [...names];
  };

  // —— Form Reset ——
  const resetForm = () => {
    setSelectedMain('');
    setSelectedSecond('');
    setSelectedThird('');
    setError('');
  };
  const openAddForm = () => {
    setEditItem(null);
    resetForm();
    setShowForm(true);
  };
  const cancelForm = () => {
    setShowForm(false);
    setEditItem(null);
    resetForm();
  };
  const handleEdit = item => {
    setEditItem(item);
    setSelectedMain(item.mainCategory || '');
    setSelectedSecond(item.subCategory || '');
    setSelectedThird(item.thirdCategory || item.spec || '');
    setShowForm(true);
    setError('');
  };

  // —— Save ——
  const handleSave = async () => {
    if (!selectedMain || !selectedSecond || !selectedThird) {
      setError('请完整选择大类、二级分类和三级分类');
      return;
    }

    // Check duplicate
    const dup = suggestions.find(s => {
      if (editItem && s._id === editItem._id) return false;
      return s.mainCategory === selectedMain && s.subCategory === selectedSecond && (s.thirdCategory === selectedThird || s.spec === selectedThird);
    });
    if (dup) {
      setError('该三级分类已添加为建议类别');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // Ensure collection exists by checking with a dummy query first
      try {
        await db.collection('suggestions').limit(0).get();
      } catch (_) {
        // Collection might not exist, we'll proceed anyway
      }
      const entry = {
        mainCategory: selectedMain,
        subCategory: selectedSecond,
        thirdCategory: selectedThird,
        spec: selectedThird,
        content: `${selectedMain} / ${selectedSecond} / ${selectedThird}`,
        createdAt: new Date().toISOString()
      };
      if (editItem) {
        await db.collection('suggestions').doc(editItem._id).update({
          ...entry,
          updatedAt: new Date().toISOString()
        });
      } else {
        await db.collection('suggestions').add(entry);
      }
      resetForm();
      setEditItem(null);
      setShowForm(false);
      await loadSuggestions();
    } catch (e) {
      console.error('Save suggestion error:', e);
      setError(`保存失败：${e.message || '请检查数据库权限'}`);
    } finally {
      setSaving(false);
    }
  };

  // —— Delete ——
  const handleDelete = async id => {
    if (!window.confirm('确定要删除此建议类别？')) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('suggestions').doc(id).remove();
      await loadSuggestions();
    } catch (e) {
      console.error('Delete suggestion error:', e);
      alert('删除失败：' + (e.message || ''));
    }
  };

  // Available options for second/third dropdowns
  const availableSecond = selectedMain ? getSecond(selectedMain) : [];
  const availableThird = selectedMain && selectedSecond ? getThird(selectedMain, selectedSecond) : [];
  return <div className="min-h-screen bg-[#FFF8F0]">
      <NavBar title="建议捐赠类别管理" showBack={true} onBack={() => $w.utils.navigateBack()} $w={$w} />

      <div className="mx-4 mt-6">
        {/* Description */}
        <div className="bg-gradient-to-br from-[#E8724A]/10 to-[#F4A261]/10 rounded-2xl p-5 border border-[#F0E6D8] mb-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-[#E8724A] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-serif font-semibold text-sm text-[#1B1B2F]">建议捐赠类别说明</h3>
              <p className="text-xs text-gray-600 font-sans mt-1.5 leading-relaxed">
                此处管理统计看板中「建议捐赠类别」模块的内容。请从已有类目中选择建议捐赠的三级分类，帮助志愿者了解当前急需哪些物资。
              </p>
            </div>
          </div>
        </div>

        {/* Add Button */}
        {isAdmin && !showForm && <button onClick={openAddForm} className="w-full mb-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white font-serif font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
            <Plus size={18} />
            新增建议类别
          </button>}

        {/* Form */}
        {showForm && <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-5 border border-[#F0E6D8]">
            <h3 className="font-serif font-semibold text-sm text-[#1B1B2F] mb-4">
              {editItem ? '编辑建议类别' : '新增建议类别'}
            </h3>

            {error && <div className="mb-3 px-3 py-2.5 rounded-xl bg-red-50 text-xs text-red-600 font-sans flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>}

            {/* 大类选择 */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 font-sans mb-1.5">选择大类</label>
              <div className="relative">
                <select value={selectedMain} onChange={e => {
              setSelectedMain(e.target.value);
              setSelectedSecond('');
              setSelectedThird('');
            }} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFF8F0] text-sm font-sans text-[#1B1B2F] appearance-none focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all">
                  <option value="">—— 请选择大类 ——</option>
                  {mainSet.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 二级分类选择 */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 font-sans mb-1.5">选择二级分类</label>
              <div className="relative">
                <select value={selectedSecond} onChange={e => {
              setSelectedSecond(e.target.value);
              setSelectedThird('');
            }} disabled={!selectedMain} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFF8F0] text-sm font-sans text-[#1B1B2F] appearance-none focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="">—— 请选择二级分类 ——</option>
                  {availableSecond.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 三级分类选择 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 font-sans mb-1.5">选择三级分类</label>
              <div className="relative">
                <select value={selectedThird} onChange={e => setSelectedThird(e.target.value)} disabled={!selectedSecond} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFF8F0] text-sm font-sans text-[#1B1B2F] appearance-none focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="">—— 请选择三级分类 ——</option>
                  {availableThird.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Preview */}
            {selectedMain && selectedSecond && selectedThird && <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFF0E6] border border-[#FEE2D6]">
                <p className="text-xs text-gray-500 font-sans mb-1">已选择</p>
                <p className="text-sm font-semibold text-[#1B1B2F] font-sans">{selectedMain} / {selectedSecond} / {selectedThird}</p>
              </div>}

            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={cancelForm} className="px-5 py-3 rounded-xl border border-[#F0E6D8] bg-white text-gray-500 text-sm font-sans hover:bg-[#FFF8F0] transition-all flex items-center gap-2">
                <X size={16} />
                取消
              </button>
            </div>
          </div>}

        {/* Suggestions List */}
        {loading ? <div className="flex items-center justify-center h-40">
            <Loader2 size={28} className="animate-spin text-[#E8724A]" />
          </div> : suggestions.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-sans">暂无建议捐赠类别</p>
            {isAdmin && <p className="text-xs text-gray-300 font-sans mt-2">点击上方按钮从已有类目中添加</p>}
          </div> : <div className="space-y-3">
            {suggestions.map((item, idx) => <div key={item._id} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#F0E6D8] hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#E8724A] to-[#F4A261] flex items-center justify-center text-white text-xs font-medium shrink-0">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-sans text-[#1B1B2F] leading-relaxed">{item.content || `${item.mainCategory} / ${item.subCategory} / ${item.thirdCategory || item.spec}`}</p>
                        <p className="text-[10px] text-gray-400 font-sans mt-0.5">
                          {item.mainCategory} &gt; {item.subCategory} &gt; {item.thirdCategory || item.spec}
                        </p>
                      </div>
                    </div>
                    {item.createdAt && <p className="text-[10px] text-gray-400 font-sans mt-2 ml-8">
                        创建时间：{item.createdAt.slice(0, 10)}
                        {item.updatedAt && ` · 更新：${item.updatedAt.slice(0, 10)}`}
                      </p>}
                  </div>
                  {isAdmin && <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleEdit(item)} className="w-8 h-8 rounded-xl bg-[#FFF8F0] hover:bg-[#FEE2D6] flex items-center justify-center transition-all" title="编辑">
                        <Edit3 size={14} className="text-[#E8724A]" />
                      </button>
                      <button onClick={() => handleDelete(item._id)} className="w-8 h-8 rounded-xl bg-[#FFF8F0] hover:bg-red-50 flex items-center justify-center transition-all" title="删除">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>}
                </div>
              </div>)}
          </div>}
      </div>

      <div className="text-center mt-8 pb-8">
        <p className="text-xs text-gray-300 font-sans">仅管理员可管理建议捐赠类别</p>
      </div>
    </div>;
}