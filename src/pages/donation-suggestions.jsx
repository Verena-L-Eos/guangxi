// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Plus, Edit3, Trash2, X, Save, AlertCircle, Loader2, Check, Package, ChevronDown, ChevronUp } from 'lucide-react';
// @ts-ignore;
import { useToast } from '@/components/ui';

import { NavBar } from '@/components/NavBar.jsx';
export default function DonationSuggestionsPage(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState([]); // array of {mainCategory, subCategory, thirdCategory, unit}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allThird, setAllThird] = useState([]); // all third-level categories from categories collection
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedMain, setExpandedMain] = useState({});
  useEffect(() => {
    loadSuggestions();
    loadCategories();
  }, []);
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
  const loadCategories = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('categories').get();
      const list = (res.data || []).filter(c => c.thirdCategory || c.spec);
      const mapped = list.map(c => ({
        mainCategory: c.mainCategory,
        subCategory: c.subCategory,
        thirdCategory: c.thirdCategory || c.spec,
        unit: c.unit || ''
      }));
      setAllThird(mapped);
    } catch (e) {
      console.error('Load categories error:', e);
      setAllThird([]);
    }
  };

  // Build tree from allThird: main -> sub -> [third]
  const tree = {};
  allThird.forEach(c => {
    if (!tree[c.mainCategory]) tree[c.mainCategory] = {};
    if (!tree[c.mainCategory][c.subCategory]) tree[c.mainCategory][c.subCategory] = [];
    if (!tree[c.mainCategory][c.subCategory].some(t => t.thirdCategory === c.thirdCategory)) {
      tree[c.mainCategory][c.subCategory].push(c);
    }
  });
  const mainCats = Object.keys(tree);
  const catKey = c => `${c.mainCategory}/${c.subCategory}/${c.thirdCategory}`;
  const isSelected = c => selected.some(s => catKey(s) === catKey(c));
  const toggleCat = c => {
    setError('');
    if (isSelected(c)) {
      setSelected(selected.filter(s => catKey(s) !== catKey(c)));
    } else {
      setSelected([...selected, c]);
    }
  };
  const handleSave = async () => {
    if (selected.length === 0) {
      setError('请从类目管理中至少选择一个三级分类');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      if (editItem) {
        await db.collection('suggestions').doc(editItem._id).update({
          categories: selected,
          updatedAt: new Date().toISOString()
        });
        toast({
          title: '保存成功',
          description: `已更新 ${selected.length} 个建议类别`
        });
      } else {
        await db.collection('suggestions').add({
          categories: selected,
          createdAt: new Date().toISOString(),
          createdBy: $w?.auth?.currentUser?.userId || ''
        });
        toast({
          title: '添加成功',
          description: `已新增 ${selected.length} 个建议类别`
        });
      }
      setSelected([]);
      setEditItem(null);
      setShowForm(false);
      setPickerOpen(false);
      await loadSuggestions();
    } catch (e) {
      console.error('Save suggestion error:', e);
      setError('保存失败：' + (e?.message || '请检查数据库权限或联系管理员'));
      toast({
        title: '保存失败',
        description: e?.message || '请检查数据库权限或联系管理员',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = item => {
    setEditItem(item);
    setSelected(item.categories || []);
    setShowForm(true);
    setPickerOpen(false);
    setError('');
  };
  const handleDelete = async id => {
    if (!window.confirm('确定要删除此建议类别？')) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('suggestions').doc(id).remove();
      await loadSuggestions();
      toast({
        title: '删除成功'
      });
    } catch (e) {
      console.error('Delete suggestion error:', e);
      toast({
        title: '删除失败',
        description: e?.message || '请重试',
        variant: 'destructive'
      });
    }
  };
  const openAddForm = () => {
    setEditItem(null);
    setSelected([]);
    setError('');
    setShowForm(true);
    setPickerOpen(false);
  };
  const cancelForm = () => {
    setShowForm(false);
    setEditItem(null);
    setSelected([]);
    setPickerOpen(false);
    setError('');
  };
  const toggleMain = m => setExpandedMain(p => ({
    ...p,
    [m]: !p[m]
  }));
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
              此处管理统计看板中「建议捐赠类别」模块的内容。添加的建议类别将展示给所有用户参考，帮助志愿者了解当前急需哪些物资。请从类目管理中选择一个或多个三级分类作为建议类别。
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
        <h3 className="font-serif font-semibold text-sm text-[#1B1B2F] mb-3">
          {editItem ? '编辑建议类别' : '新增建议类别'}
        </h3>
        {error && <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 text-xs text-red-600 font-sans flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>}

        {/* Selected summary */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 font-sans mb-2">已选三级分类（{selected.length}）</p>
          {selected.length === 0 ? <p className="text-xs text-gray-300 font-sans">尚未选择，点击下方按钮从类目管理中选取</p> : <div className="flex flex-wrap gap-2">
            {selected.map(c => <span key={catKey(c)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF0E6] text-xs text-gray-700 font-sans">
              <Package size={11} className="text-[#E8724A]" />
              {c.thirdCategory}
              <button onClick={() => toggleCat(c)} className="text-gray-400 hover:text-red-500">
                <X size={11} />
              </button>
            </span>)}
          </div>}
        </div>

        {/* Picker toggle */}
        <button onClick={() => setPickerOpen(!pickerOpen)} className="w-full py-2.5 rounded-xl border border-dashed border-[#E8724A]/40 bg-[#FFF8F0] text-sm text-[#E8724A] font-sans flex items-center justify-center gap-2 hover:bg-[#FEE2D6] transition-all">
          {pickerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {pickerOpen ? '收起类目列表' : '从类目管理选择三级分类'}
        </button>

        {/* Category picker tree */}
        {pickerOpen && <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-[#F0E6D8] bg-[#FFF8F0] p-2">
          {mainCats.length === 0 ? <p className="text-xs text-gray-300 font-sans text-center py-6">类目管理中暂无三级分类</p> : mainCats.map(m => <div key={m} className="mb-1">
            <button onClick={() => toggleMain(m)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#FEE2D6] transition-all">
              <span className="text-sm font-serif font-semibold text-[#1B1B2F]">{m}</span>
              {expandedMain[m] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {expandedMain[m] && Object.keys(tree[m]).map(s => <div key={s} className="ml-3 mb-1">
              <p className="text-xs text-gray-500 font-sans px-3 py-1">{s}</p>
              <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                {tree[m][s].map(c => {
                  const sel = isSelected(c);
                  return <button key={catKey(c)} onClick={() => toggleCat(c)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans border transition-all ${sel ? 'bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white border-transparent' : 'bg-white text-gray-600 border-[#F0E6D8] hover:border-[#E8724A]'}`}>
                    {sel && <Check size={11} />}
                    {c.thirdCategory}
                    {c.unit && <span className="opacity-70">（{c.unit}）</span>}
                  </button>;
                })}
              </div>
            </div>)}
          </div>)}
        </div>}

        <div className="flex items-center gap-3 mt-4">
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
          {isAdmin && <p className="text-xs text-gray-300 font-sans mt-2">点击上方按钮添加第一条建议</p>}
        </div> : <div className="space-y-3">
          {suggestions.map((item, idx) => <div key={item._id} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#F0E6D8] hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#E8724A] to-[#F4A261] flex items-center justify-center text-white text-xs font-medium shrink-0">{idx + 1}</span>
                    <p className="text-sm font-serif font-semibold text-[#1B1B2F]">建议类别组 {idx + 1}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 ml-8">
                    {(item.categories || []).map((c, i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0E6] text-xs text-gray-700 font-sans">
                      <Package size={10} className="text-[#E8724A]" />
                      {c.thirdCategory}
                      {c.unit && <span className="opacity-70">（{c.unit}）</span>}
                    </span>)}
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