// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Plus, Trash2, Tags, FolderOpen, ChevronRight, ChevronDown, Loader2, Shield, Edit3, Check, X } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function CategoriesPage(props) {
  const {
    $w
  } = props;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);

  // Inline add state: { level, parentMain, parentSecond, parentThird }
  const [inlineAdd, setInlineAdd] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [addLoading, setAddLoading] = useState(false);
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

  // Build tree: mainCategory → subCategory → thirdCategory → [units]
  const tree = {};
  const mainSet = new Set();
  const secondMap = {}; // mainCat -> Set(secondCat)
  const thirdMap = {}; // mainCat-secondCat -> Set(thirdName)
  const unitMap = {}; // mainCat-secondCat-thirdName -> Set(unit)

  categories.forEach(c => {
    const m = c.mainCategory;
    const s = c.subCategory;
    const t = c.thirdCategory || c.spec || '';
    const u = c.unit || '';
    if (!tree[m]) {
      tree[m] = {};
      secondMap[m] = new Set();
    }
    if (!tree[m][s]) {
      tree[m][s] = {};
      thirdMap[`${m}-${s}`] = new Set();
    }
    if (t && !tree[m][s][t]) {
      tree[m][s][t] = new Set();
      thirdMap[`${m}-${s}`].add(t);
    }
    if (t && u) {
      tree[m][s][t].add(u);
      const uKey = `${m}-${s}-${t}`;
      if (!unitMap[uKey]) unitMap[uKey] = new Set();
      unitMap[uKey].add(u);
    }
    mainSet.add(m);
    secondMap[m].add(s);
  });
  const [expandedMain, setExpandedMain] = useState({});
  const [expandedSecond, setExpandedSecond] = useState({});
  const [expandedThird, setExpandedThird] = useState({});
  const toggleMain = m => setExpandedMain(p => ({
    ...p,
    [m]: !p[m]
  }));
  const toggleSecond = key => setExpandedSecond(p => ({
    ...p,
    [key]: !p[key]
  }));
  const toggleThird = key => setExpandedThird(p => ({
    ...p,
    [key]: !p[key]
  }));
  const startInlineAdd = (level, parentMain, parentSecond, parentThird) => {
    setInlineAdd({
      level,
      parentMain,
      parentSecond,
      parentThird
    });
    setInputValue('');
  };
  const handleInlineAdd = async () => {
    if (!inputValue.trim()) {
      alert('请输入内容');
      return;
    }
    const val = inputValue.trim();
    const {
      level,
      parentMain,
      parentSecond,
      parentThird
    } = inlineAdd;

    // Dedup check
    if (level === 'main') {
      if (mainSet.has(val)) {
        alert(`大类「${val}」已存在`);
        return;
      }
    } else if (level === 'second') {
      if (secondMap[parentMain]?.has(val)) {
        alert(`二级分类「${val}」已存在`);
        return;
      }
    } else if (level === 'third') {
      const key = `${parentMain}-${parentSecond}`;
      if (thirdMap[key]?.has(val)) {
        alert(`三级分类「${val}」已存在`);
        return;
      }
    } else if (level === 'unit') {
      const key = `${parentMain}-${parentSecond}-${parentThird}`;
      if (unitMap[key]?.has(val)) {
        alert(`单位「${val}」已存在`);
        return;
      }
    }
    setAddLoading(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const doc = {
        mainCategory: parentMain,
        subCategory: parentSecond || (level === 'second' ? val : ''),
        thirdCategory: parentThird || (level === 'third' ? val : ''),
        spec: parentThird || (level === 'third' ? val : ''),
        unit: level === 'unit' ? val : '',
        createdAt: new Date().toISOString()
      };
      // Adjust per level
      if (level === 'main') {
        doc.mainCategory = val;
        doc.subCategory = '';
        doc.thirdCategory = '';
        doc.spec = '';
        doc.unit = '';
      } else if (level === 'second') {
        doc.subCategory = val;
        doc.thirdCategory = '';
        doc.spec = '';
        doc.unit = '';
      } else if (level === 'third') {
        doc.thirdCategory = val;
        doc.spec = val;
        doc.unit = '';
      }
      await db.collection('categories').add(doc);
      setInlineAdd(null);
      setInputValue('');
      loadCategories();
    } catch (e) {
      console.error('Add error:', e);
      alert('添加失败');
    } finally {
      setAddLoading(false);
    }
  };
  const handleDelete = async (id, name) => {
    if (!window.confirm(`确定删除「${name}」？`)) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('categories').doc(id).remove();
      loadCategories();
    } catch (e) {
      console.error('Delete error:', e);
      alert('删除失败');
    }
  };
  // Deletes all documents matching a level (used for bulk deletion)
  const handleBulkDelete = async (level, name, parentMain, parentSecond, parentThird) => {
    const label = level === 'main' ? `大类「${name}」及所有下级分类` : level === 'second' ? `二级分类「${name}」及所有下级分类` : level === 'third' ? `三级分类「${name}」及所属单位` : `单位「${name}」`;
    if (!window.confirm(`确定删除${label}？`)) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      let docs = [];
      if (level === 'main') {
        docs = categories.filter(c => c.mainCategory === name);
      } else if (level === 'second') {
        docs = categories.filter(c => c.mainCategory === parentMain && c.subCategory === name);
      } else if (level === 'third') {
        docs = categories.filter(c => c.mainCategory === parentMain && c.subCategory === parentSecond && (c.thirdCategory === name || c.spec === name));
      }
      for (const doc of docs) {
        await db.collection('categories').doc(doc._id).remove();
      }
      loadCategories();
    } catch (e) {
      console.error('Bulk delete error:', e);
      alert('删除失败');
    }
  };
  const handleDeleteUnit = async (mainCat, secondCat, thirdCat, unitToDelete) => {
    if (!window.confirm(`确定删除单位「${unitToDelete}」？`)) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      // Find documents matching this combination with this unit
      const matchingDocs = categories.filter(c => c.mainCategory === mainCat && c.subCategory === secondCat && (c.thirdCategory === thirdCat || c.spec === thirdCat) && c.unit === unitToDelete);
      for (const doc of matchingDocs) {
        await db.collection('categories').doc(doc._id).remove();
      }
      loadCategories();
    } catch (e) {
      console.error('Delete unit error:', e);
      alert('删除失败');
    }
  };
  // Edit state & functions
  const [editState, setEditState] = useState(null); // { level: 'main'|'second'|'third'|'unit', key, oldValue, parentMain, parentSecond, parentThird }
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const startEdit = (level, oldValue, parentMain, parentSecond, parentThird) => {
    setEditState({
      level,
      oldValue,
      parentMain,
      parentSecond,
      parentThird
    });
    setEditValue(oldValue);
  };
  const cancelEdit = () => {
    setEditState(null);
    setEditValue('');
  };
  const handleEditSave = async () => {
    if (!editValue.trim() || editValue.trim() === editState.oldValue) {
      cancelEdit();
      return;
    }
    const newVal = editValue.trim();
    setEditLoading(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const {
        level,
        oldValue,
        parentMain,
        parentSecond,
        parentThird
      } = editState;
      if (level === 'main') {
        // Update all docs with this mainCategory
        const docs = categories.filter(c => c.mainCategory === oldValue);
        for (const doc of docs) {
          await db.collection('categories').doc(doc._id).update({
            mainCategory: newVal
          });
        }
      } else if (level === 'second') {
        const docs = categories.filter(c => c.mainCategory === parentMain && c.subCategory === oldValue);
        for (const doc of docs) {
          await db.collection('categories').doc(doc._id).update({
            subCategory: newVal
          });
        }
      } else if (level === 'third') {
        const docs = categories.filter(c => c.mainCategory === parentMain && c.subCategory === parentSecond && (c.thirdCategory === oldValue || c.spec === oldValue));
        for (const doc of docs) {
          await db.collection('categories').doc(doc._id).update({
            thirdCategory: newVal,
            spec: newVal
          });
        }
      } else if (level === 'unit') {
        // Unit is stored as separate docs with the unit field
        const docs = categories.filter(c => c.mainCategory === parentMain && c.subCategory === parentSecond && (c.thirdCategory === parentThird || c.spec === parentThird) && c.unit === oldValue);
        for (const doc of docs) {
          await db.collection('categories').doc(doc._id).update({
            unit: newVal
          });
        }
      }
      cancelEdit();
      loadCategories();
    } catch (e) {
      console.error('Edit error:', e);
      alert('修改失败');
    } finally {
      setEditLoading(false);
    }
  };
  const handleBack = () => {
    $w.utils.navigateBack();
  };
  return <div className="min-h-screen pb-8 bg-[#FFF8F0]">
      <NavBar title="类目管理" showBack onBack={handleBack} $w={$w} />

      <div className="mx-4 mt-4">
        {!isAdmin && <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-2xl bg-[#FFF0E6] text-sm text-gray-600 font-sans">
          <Shield size={16} className="text-[#E8724A]" />
          当前为只读模式，仅可查看类目结构
        </div>}

        {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-[#E8724A]" /></div> : mainSet.size === 0 ? <div className="bg-white rounded-2xl p-10 text-center shadow-card">
              <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-sans">暂无物资类目</p>
              {isAdmin && <button onClick={() => startInlineAdd('main', '新大类')} className="mt-4 px-5 py-2 rounded-full bg-[#E8724A] text-white text-sm font-medium">添加大类</button>}
            </div> : <div className="space-y-3">
              {/* Quick add main category */}
              {isAdmin && inlineAdd?.level === 'main' ? <div className="bg-white rounded-2xl p-4 shadow-card">
                  <label className="block text-xs font-medium text-gray-500 mb-2 font-sans">新增大类</label>
                  <div className="flex gap-2">
                    <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="输入大类名称" className="flex-1 px-4 py-2.5 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" autoFocus onKeyDown={e => e.key === 'Enter' && handleInlineAdd()} />
                    <button onClick={handleInlineAdd} disabled={addLoading} className="px-4 py-2.5 rounded-xl bg-[#E8724A] text-white text-sm font-medium hover:bg-[#D4633F]">
                      {addLoading ? <Loader2 size={16} className="animate-spin" /> : '确认'}
                    </button>
                    <button onClick={() => setInlineAdd(null)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">取消</button>
                  </div>
                </div> : isAdmin && <button onClick={() => startInlineAdd('main', '')} className="w-full mb-3 py-3 rounded-2xl border-2 border-dashed border-[#E8724A]/40 text-[#E8724A] font-serif font-medium hover:bg-[#FFF0E6] transition-all flex items-center justify-center gap-2">
                  <Plus size={16} /> 添加大类
                </button>}

              {Array.from(mainSet).map(mainCat => {
          const isMainOpen = expandedMain[mainCat];
          const secondCats = secondMap[mainCat] ? Array.from(secondMap[mainCat]) : [];
          return <div key={mainCat} className="bg-white rounded-2xl overflow-hidden shadow-card">
                    <button onClick={() => toggleMain(mainCat)} className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white hover:opacity-95 transition-opacity">
                      {isMainOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <FolderOpen size={16} />
                      <span className="font-serif font-semibold">{editState?.level === 'main' && editState?.oldValue === mainCat ? <input value={editValue} onChange={e => setEditValue(e.target.value)} className="px-2 py-0.5 rounded-md bg-white/20 text-white text-sm font-mono w-28" autoFocus onKeyDown={e => {
                  if (e.key === 'Enter') handleEditSave();
                  if (e.key === 'Escape') cancelEdit();
                }} onClick={e => e.stopPropagation()} /> : mainCat}</span>
                      {isAdmin && editState?.level === 'main' && editState?.oldValue === mainCat ? <span className="flex items-center gap-1 ml-2">
                          <button onClick={e => {
                  e.stopPropagation();
                  handleEditSave();
                }} disabled={editLoading} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/20 hover:bg-white/30">{editLoading ? <Loader2 size={10} className="animate-spin" /> : <Check size={12} />}</button>
                          <button onClick={e => {
                  e.stopPropagation();
                  cancelEdit();
                }} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/20 hover:bg-white/30"><X size={12} /></button>
                        </span> : <>
                          <span className="ml-auto text-xs text-white/70 font-sans">{secondCats.length}个二级分类</span>
                          {isAdmin && <span className="ml-2 flex items-center gap-1">
                              <button onClick={e => {
                    e.stopPropagation();
                    startEdit('main', mainCat);
                  }} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/20 hover:bg-white/30 text-white/80 hover:text-white"><Edit3 size={11} /></button>
                              <button onClick={e => {
                    e.stopPropagation();
                    handleBulkDelete('main', mainCat);
                  }} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/20 hover:bg-white/30 text-white/80 hover:text-red-300"><Trash2 size={11} /></button>
                            </span>}
                        </>}
                    </button>
                    {isMainOpen && <div className="divide-y divide-[#F0E6D8]">
                        {/* Inline add for second category */}
                        {isAdmin && inlineAdd?.level === 'second' && inlineAdd?.parentMain === mainCat && <div className="px-4 py-3 bg-[#FFFBF5]">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">新增二级分类（于「{mainCat}」下）</label>
                            <div className="flex gap-2">
                              <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="输入二级分类名称" className="flex-1 px-4 py-2.5 rounded-xl border border-[#F0E6D8] bg-white text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" autoFocus onKeyDown={e => e.key === 'Enter' && handleInlineAdd()} />
                              <button onClick={handleInlineAdd} disabled={addLoading} className="px-4 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-sm font-medium">
                                {addLoading ? <Loader2 size={16} className="animate-spin" /> : '确认'}
                              </button>
                              <button onClick={() => setInlineAdd(null)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">取消</button>
                            </div>
                          </div>}

                        {isAdmin && <button onClick={() => startInlineAdd('second', mainCat)} className="w-full flex items-center gap-2 pl-8 pr-4 py-2 text-sm text-[#2D6A4F] font-sans hover:bg-[#E8F5E9] transition-colors border-b border-[#F0E6D8]/50">
                            <Plus size={12} />
                            添加二级分类
                          </button>}

                        {secondCats.map(secCat => {
                const secKey = `${mainCat}-${secCat}`;
                const isSecOpen = expandedSecond[secKey];
                const thirdItems = thirdMap[secKey] ? Array.from(thirdMap[secKey]) : [];
                const thirdUnits = {}; // thirdName -> [units]
                thirdItems.forEach(t => {
                  const uKey = `${secKey}-${t}`;
                  thirdUnits[t] = unitMap[uKey] ? Array.from(unitMap[uKey]) : [];
                });
                return <div key={secKey}>
                              <button onClick={() => toggleSecond(secKey)} className="w-full flex items-center gap-2 pl-8 pr-4 py-3 hover:bg-[#FFF8F0] transition-colors text-left">
                                {isSecOpen ? <ChevronDown size={14} className="text-[#2D6A4F]" /> : <ChevronRight size={14} className="text-[#2D6A4F]" />}
                                {editState?.level === 'second' && editState?.parentMain === mainCat && editState?.oldValue === secCat ? <input value={editValue} onChange={e => setEditValue(e.target.value)} className="px-2 py-0.5 rounded-md border border-[#2D6A4F]/30 bg-white text-sm font-sans w-28" autoFocus onKeyDown={e => {
                      if (e.key === 'Enter') handleEditSave();
                      if (e.key === 'Escape') cancelEdit();
                    }} onClick={e => e.stopPropagation()} /> : <span className="text-sm font-medium text-[#1B1B2F] font-sans">{secCat}</span>}
                                {editState?.level === 'second' && editState?.parentMain === mainCat && editState?.oldValue === secCat ? <span className="flex items-center gap-1 ml-auto">
                                    <button onClick={e => {
                        e.stopPropagation();
                        handleEditSave();
                      }} disabled={editLoading} className="w-6 h-6 flex items-center justify-center rounded-md bg-green-50 hover:bg-green-100">{editLoading ? <Loader2 size={10} className="animate-spin text-green-600" /> : <Check size={12} className="text-green-600" />}</button>
                                    <button onClick={e => {
                        e.stopPropagation();
                        cancelEdit();
                      }} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100"><X size={12} className="text-gray-500" /></button>
                                  </span> : <>
                                    <span className="text-xs text-gray-400 font-sans ml-auto">{thirdItems.length}个三级分类</span>
                                    {isAdmin && <span className="ml-2 flex items-center gap-1">
                                        <button onClick={e => {
                          e.stopPropagation();
                          startEdit('second', secCat, mainCat);
                        }} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100"><Edit3 size={11} className="text-gray-500" /></button>
                                        <button onClick={e => {
                          e.stopPropagation();
                          handleBulkDelete('second', secCat, mainCat);
                        }} className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100"><Trash2 size={11} className="text-red-400" /></button>
                                      </span>}
                                  </>}
                              </button>
                              {isSecOpen && <div className="bg-[#FFFBF5]">
                                  {/* Inline add for third category */}
                                  {isAdmin && inlineAdd?.level === 'third' && inlineAdd?.parentMain === mainCat && inlineAdd?.parentSecond === secCat && <div className="px-4 py-2.5 bg-[#FFFBF5] border-t border-[#F0E6D8]/50">
                                      <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">新增三级分类（于「{mainCat} / {secCat}」下）</label>
                                      <div className="flex gap-2">
                                        <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="输入三级分类名称" className="flex-1 px-4 py-2.5 rounded-xl border border-[#F0E6D8] bg-white text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" autoFocus onKeyDown={e => e.key === 'Enter' && handleInlineAdd()} />
                                        <button onClick={handleInlineAdd} disabled={addLoading} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium">
                                          {addLoading ? <Loader2 size={16} className="animate-spin" /> : '确认'}
                                        </button>
                                        <button onClick={() => setInlineAdd(null)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">取消</button>
                                      </div>
                                    </div>}

                                  {isAdmin && <button onClick={() => startInlineAdd('third', mainCat, secCat)} className="w-full flex items-center gap-2 pl-14 pr-4 py-2 text-sm text-amber-600 font-sans hover:bg-[#FFF8E1] transition-colors border-b border-[#F0E6D8]/50">
                                      <Plus size={12} />
                                      添加三级分类
                                    </button>}

                                  {thirdItems.map(thirdName => {
                      const thirdKey = `${secKey}-${thirdName}`;
                      const isThirdOpen = expandedThird[thirdKey];
                      const units = thirdUnits[thirdName] || [];
                      return <div key={thirdName}>
                                      <button onClick={() => toggleThird(thirdKey)} className="w-full flex items-center gap-2 pl-14 pr-4 py-2.5 hover:bg-[#FFF8F0] transition-colors text-left border-t border-[#F0E6D8]/50">
                                        {isThirdOpen ? <ChevronDown size={12} className="text-[#F4A261]" /> : <ChevronRight size={12} className="text-[#F4A261]" />}
                                        <Tags size={12} className="text-[#F4A261]" />
                                        {editState?.level === 'third' && editState?.parentMain === mainCat && editState?.parentSecond === secCat && editState?.oldValue === thirdName ? <input value={editValue} onChange={e => setEditValue(e.target.value)} className="px-2 py-0.5 rounded-md border border-amber-500/30 bg-white text-sm font-sans w-28" autoFocus onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave();
                            if (e.key === 'Escape') cancelEdit();
                          }} onClick={e => e.stopPropagation()} /> : <span className="text-sm text-gray-700 font-sans">{thirdName}</span>}
                                        {editState?.level === 'third' && editState?.parentMain === mainCat && editState?.parentSecond === secCat && editState?.oldValue === thirdName ? <span className="flex items-center gap-1 ml-auto">
                                            <button onClick={e => {
                              e.stopPropagation();
                              handleEditSave();
                            }} disabled={editLoading} className="w-6 h-6 flex items-center justify-center rounded-md bg-green-50 hover:bg-green-100">{editLoading ? <Loader2 size={10} className="animate-spin text-green-600" /> : <Check size={12} className="text-green-600" />}</button>
                                            <button onClick={e => {
                              e.stopPropagation();
                              cancelEdit();
                            }} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100"><X size={12} className="text-gray-500" /></button>
                                          </span> : <>
                                            <span className="text-xs text-gray-400 font-sans ml-auto">{units.length}个单位</span>
                                            {isAdmin && <span className="ml-2 flex items-center gap-1">
                                                <button onClick={e => {
                                e.stopPropagation();
                                startEdit('third', thirdName, mainCat, secCat);
                              }} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100"><Edit3 size={11} className="text-gray-500" /></button>
                                                <button onClick={e => {
                                e.stopPropagation();
                                handleBulkDelete('third', thirdName, mainCat, secCat);
                              }} className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100"><Trash2 size={11} className="text-red-400" /></button>
                                              </span>}
                                          </>}
                                      </button>
                                      {isThirdOpen && <div className="bg-[#FFFAF5] pb-2">
                                          {/* Inline add for unit */}
                                          {isAdmin && inlineAdd?.level === 'unit' && inlineAdd?.parentMain === mainCat && inlineAdd?.parentSecond === secCat && inlineAdd?.parentThird === thirdName && <div className="px-4 py-2.5 border-t border-[#F0E6D8]/50">
                                              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-sans">新增单位</label>
                                              <div className="flex gap-2">
                                                <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="例如：ml、瓶、kg" className="flex-1 px-4 py-2 rounded-xl border border-[#F0E6D8] bg-white text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" autoFocus onKeyDown={e => e.key === 'Enter' && handleInlineAdd()} />
                                                <button onClick={handleInlineAdd} disabled={addLoading} className="px-4 py-2 rounded-xl bg-[#E8724A] text-white text-sm font-medium">
                                                  {addLoading ? <Loader2 size={16} className="animate-spin" /> : '确认'}
                                                </button>
                                                <button onClick={() => setInlineAdd(null)} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm">取消</button>
                                              </div>
                                            </div>}

                                          {units.length === 0 ? <div className="flex items-center justify-between pl-20 pr-4 py-2">
                                              <span className="text-xs text-gray-400 font-sans">暂无单位</span>
                                              {isAdmin && <button onClick={() => startInlineAdd('unit', mainCat, secCat, thirdName)} className="text-xs text-[#E8724A] font-sans flex items-center gap-1 hover:underline">
                                                  <Plus size={10} /> 添加
                                                </button>}
                                            </div> : <div className="pl-20 pr-4 py-1.5 space-y-1.5">
                                              {units.map(u => <div key={u} className="flex items-center justify-between py-1">
                                                  {editState?.level === 'unit' && editState?.parentThird === thirdName && editState?.parentSecond === secCat && editState?.parentMain === mainCat && editState?.oldValue === u ? <div className="flex items-center gap-1.5">
                                                      <input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-20 px-2 py-0.5 rounded-md border border-[#E8724A]/30 bg-white text-xs font-mono" autoFocus onKeyDown={e => {
                                  if (e.key === 'Enter') handleEditSave();
                                  if (e.key === 'Escape') cancelEdit();
                                }} onClick={e => e.stopPropagation()} />
                                                      <button onClick={e => {
                                  e.stopPropagation();
                                  handleEditSave();
                                }} disabled={editLoading} className="w-5 h-5 flex items-center justify-center rounded bg-green-50">{editLoading ? <Loader2 size={8} className="animate-spin text-green-600" /> : <Check size={10} className="text-green-600" />}</button>
                                                      <button onClick={e => {
                                  e.stopPropagation();
                                  cancelEdit();
                                }} className="w-5 h-5 flex items-center justify-center rounded bg-gray-50"><X size={10} className="text-gray-500" /></button>
                                                    </div> : <>
                                                      <span className="text-xs font-mono text-gray-600 bg-[#FFF0E6] px-2.5 py-0.5 rounded-full">{u}</span>
                                                      {isAdmin && <span className="flex items-center gap-1">
                                                          <button onClick={e => {
                                    e.stopPropagation();
                                    startEdit('unit', u, mainCat, secCat, thirdName);
                                  }} className="w-5 h-5 flex items-center justify-center rounded bg-blue-50 hover:bg-blue-100"><Edit3 size={9} className="text-blue-500" /></button>
                                                          <button onClick={() => handleDeleteUnit(mainCat, secCat, thirdName, u)} className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center hover:bg-red-100"><Trash2 size={9} className="text-red-400" /></button>
                                                        </span>}
                                                    </>}
                                                </div>)}
                                              {isAdmin && editState?.level !== 'unit' && <button onClick={() => startInlineAdd('unit', mainCat, secCat, thirdName)} className="flex items-center gap-1 text-xs text-[#E8724A] font-sans hover:underline py-1">
                                                  <Plus size={10} /> 添加单位
                                                </button>}
                                            </div>}
                                        </div>}
                                    </div>;
                    })}
                                </div>}
                            </div>;
              })}
                      </div>}
                  </div>;
        })}
            </div>}
      </div>
    </div>;
}