// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Plus, Trash2, Tags, FolderOpen, ChevronRight, ChevronDown, Loader2, Shield } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function CategoriesPage(props) {
  const {
    $w
  } = props;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState({
    mainCategory: '',
    secondCategory: '',
    thirdCategory: '',
    unit: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);
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
  const handleAdd = async () => {
    if (!newCategory.mainCategory.trim()) {
      alert('请输入大类');
      return;
    }
    if (!newCategory.secondCategory.trim()) {
      alert('请输入二级分类');
      return;
    }
    if (!newCategory.thirdCategory.trim()) {
      alert('请输入三级分类');
      return;
    }
    if (!newCategory.unit.trim()) {
      alert('请输入单位');
      return;
    }
    const dup = categories.find(c => c.mainCategory === newCategory.mainCategory.trim() && c.subCategory === newCategory.secondCategory.trim() && (c.thirdCategory || c.spec) === newCategory.thirdCategory.trim());
    if (dup) {
      alert('该三级分类已存在，不可重复添加');
      return;
    }
    setAddLoading(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('categories').add({
        mainCategory: newCategory.mainCategory.trim(),
        subCategory: newCategory.secondCategory.trim(),
        thirdCategory: newCategory.thirdCategory.trim(),
        unit: newCategory.unit.trim(),
        createdAt: new Date().toISOString()
      });
      setNewCategory({
        mainCategory: '',
        secondCategory: '',
        thirdCategory: '',
        unit: ''
      });
      setShowAdd(false);
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
  const handleBack = () => {
    $w.utils.navigateBack();
  };

  // Build tree: mainCategory → subCategory → [items]
  const tree = {};
  categories.forEach(c => {
    const m = c.mainCategory;
    const s = c.subCategory;
    if (!tree[m]) tree[m] = {};
    if (!tree[m][s]) tree[m][s] = [];
    tree[m][s].push(c);
  });
  const [expandedMain, setExpandedMain] = useState({});
  const [expandedSecond, setExpandedSecond] = useState({});
  const toggleMain = m => setExpandedMain(p => ({
    ...p,
    [m]: !p[m]
  }));
  const toggleSecond = key => setExpandedSecond(p => ({
    ...p,
    [key]: !p[key]
  }));
  return <div className="min-h-screen pb-8 bg-[#FFF8F0]">
      <NavBar title="类目管理" showBack onBack={handleBack} $w={$w} />
      <div className="mx-4 mt-4">
        {isAdmin && <button onClick={() => setShowAdd(!showAdd)} className="w-full mb-4 py-3.5 rounded-2xl bg-[#E8724A] text-white font-serif font-medium hover:bg-[#D4633F] transition-all flex items-center justify-center gap-2 shadow-md">
          <Plus size={18} />
          {showAdd ? '收起表单' : '添加新类目'}
        </button>}

        {!isAdmin && <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-2xl bg-[#FFF0E6] text-sm text-gray-600 font-sans">
          <Shield size={16} className="text-[#E8724A]" />
          当前为只读模式，仅可查看类目结构
        </div>}

        {showAdd && <div className="bg-white rounded-2xl p-5 shadow-card mb-4 animate-fade-in-up">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2"><Plus size={16} className="text-[#E8724A]" /> 新增物资类目</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-sans">大类 <span className="text-red-400">*</span></label>
                <input type="text" value={newCategory.mainCategory} onChange={e => setNewCategory({
              ...newCategory,
              mainCategory: e.target.value
            })} placeholder="例如：食品" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-sans">二级分类 <span className="text-red-400">*</span></label>
                <input type="text" value={newCategory.secondCategory} onChange={e => setNewCategory({
              ...newCategory,
              secondCategory: e.target.value
            })} placeholder="例如：饮料" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-sans">三级分类 <span className="text-red-400">*</span></label>
                <input type="text" value={newCategory.thirdCategory} onChange={e => setNewCategory({
              ...newCategory,
              thirdCategory: e.target.value
            })} placeholder="例如：矿泉水" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-sans">单位 <span className="text-red-400">*</span></label>
                <input type="text" value={newCategory.unit} onChange={e => setNewCategory({
              ...newCategory,
              unit: e.target.value
            })} placeholder="例如：ml、瓶、kg、袋" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
              </div>
              <button onClick={handleAdd} disabled={addLoading} className="w-full py-3 rounded-xl bg-[#2D6A4F] text-white text-sm font-medium shadow-sm hover:bg-[#245A43] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {addLoading ? <><Loader2 size={16} className="animate-spin" /> 添加中...</> : '确认添加'}
              </button>
            </div>
          </div>}

        {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-[#E8724A]" /></div> : Object.keys(tree).length === 0 ? <div className="bg-white rounded-2xl p-10 text-center shadow-card">
              <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-sans">暂无物资类目</p>
            </div> : <div className="space-y-3">
              {Object.entries(tree).map(([mainCat, secondCats]) => {
          const isMainOpen = expandedMain[mainCat];
          return <div key={mainCat} className="bg-white rounded-2xl overflow-hidden shadow-card">
                    <button onClick={() => toggleMain(mainCat)} className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-[#E8724A] to-[#F4A261] text-white hover:opacity-95 transition-opacity">
                      {isMainOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <FolderOpen size={16} />
                      <span className="font-serif font-semibold">{mainCat}</span>
                      <span className="ml-auto text-xs text-white/70 font-sans">{Object.keys(secondCats).length}个二级分类</span>
                    </button>
                    {isMainOpen && <div className="divide-y divide-[#F0E6D8]">
                        {Object.entries(secondCats).map(([secCat, thirdItems]) => {
                const secKey = `${mainCat}-${secCat}`;
                const isSecOpen = expandedSecond[secKey];
                return <div key={secKey}>
                              <button onClick={() => toggleSecond(secKey)} className="w-full flex items-center gap-2 pl-8 pr-4 py-3 hover:bg-[#FFF8F0] transition-colors text-left">
                                {isSecOpen ? <ChevronDown size={14} className="text-[#2D6A4F]" /> : <ChevronRight size={14} className="text-[#2D6A4F]" />}
                                <span className="text-sm font-medium text-[#1B1B2F] font-sans">{secCat}</span>
                                <span className="text-xs text-gray-400 font-sans ml-auto">{thirdItems.length}个三级分类</span>
                              </button>
                              {isSecOpen && <div className="bg-[#FFFBF5]">
                                  {thirdItems.map(item => <div key={item._id} className="flex items-center justify-between pl-14 pr-4 py-2.5 border-t border-[#F0E6D8]/50 hover:bg-[#FFF8F0] transition-colors">
                                      <div className="flex items-center gap-2">
                                        <Tags size={12} className="text-[#F4A261]" />
                                        <span className="text-sm text-gray-700 font-sans">{item.thirdCategory || item.spec || '-'}</span>
                                        <span className="text-xs text-gray-400 font-sans bg-[#FFF0E6] px-2 py-0.5 rounded-full">{item.unit || '-'}</span>
                                      </div>
                                      {isAdmin && <button onClick={() => handleDelete(item._id, item.thirdCategory || item.spec)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all">
                                          <Trash2 size={12} className="text-red-400" />
                                        </button>}
                                    </div>)}
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