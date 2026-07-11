// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Plus, Trash2, Tags, FolderOpen, Ruler, Loader2, AlertCircle } from 'lucide-react';

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
    subCategory: '',
    spec: ''
  });
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
  const handleAdd = async () => {
    if (!newCategory.mainCategory.trim()) {
      alert('请输入大类名称');
      return;
    }
    if (!newCategory.subCategory.trim()) {
      alert('请输入小类名称');
      return;
    }
    if (!newCategory.spec.trim()) {
      alert('请输入规格');
      return;
    }
    setAddLoading(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('categories').add({
        mainCategory: newCategory.mainCategory.trim(),
        subCategory: newCategory.subCategory.trim(),
        spec: newCategory.spec.trim(),
        createdAt: new Date().toISOString()
      });
      setNewCategory({
        mainCategory: '',
        subCategory: '',
        spec: ''
      });
      setShowAdd(false);
      loadCategories();
    } catch (e) {
      console.error('Add category error:', e);
      alert('添加失败，请重试');
    } finally {
      setAddLoading(false);
    }
  };
  const handleDelete = async id => {
    if (!window.confirm('确定删除该类目吗？关联的捐赠记录将不受影响。')) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('categories').doc(id).remove();
      loadCategories();
    } catch (e) {
      console.error('Delete category error:', e);
      alert('删除失败，请重试');
    }
  };
  const handleBack = () => {
    $w.utils.navigateBack();
  };

  // Group by main category
  const groupedCategories = categories.reduce((acc, cat) => {
    const key = cat.mainCategory;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});
  return <div className="min-h-screen pb-8">
      <NavBar title="类目管理" showBack onBack={handleBack} $w={$w} />

      <div className="mx-4 mt-4">
        {/* Add button */}
        <button onClick={() => setShowAdd(!showAdd)} className="w-full mb-4 py-3.5 rounded-2xl bg-[#E8724A] text-white font-serif font-medium hover:bg-[#D4633F] transition-all flex items-center justify-center gap-2 shadow-md">
          <Plus size={18} />
          {showAdd ? '收起表单' : '添加新类目'}
        </button>

        {/* Add form */}
        {showAdd && <div className="bg-white rounded-2xl p-5 shadow-card mb-4 animate-fade-in-up">
            <h3 className="font-serif font-semibold text-[#1B1B2F] mb-4 flex items-center gap-2">
              <Plus size={16} className="text-[#E8724A]" />
              新增物资类目
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-sans">
                  大类 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={newCategory.mainCategory} onChange={e => setNewCategory({
              ...newCategory,
              mainCategory: e.target.value
            })} placeholder="例如：食品、药品、生活用品" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-sans">
                  小类 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={newCategory.subCategory} onChange={e => setNewCategory({
              ...newCategory,
              subCategory: e.target.value
            })} placeholder="例如：方便面、矿泉水、帐篷" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-sans">
                  规格 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={newCategory.spec} onChange={e => setNewCategory({
              ...newCategory,
              spec: e.target.value
            })} placeholder="例如：袋装/12包、500ml/瓶、3人用" className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <button onClick={handleAdd} disabled={addLoading} className="w-full py-3 rounded-xl bg-[#2D6A4F] text-white text-sm font-medium shadow-sm hover:bg-[#245A43] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {addLoading ? <>
                    <Loader2 size={16} className="animate-spin" />
                    添加中...
                  </> : '确认添加'}
              </button>
            </div>
          </div>}

        {/* Categories list */}
        {loading ? <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-[#E8724A]" />
          </div> : Object.keys(groupedCategories).length === 0 ? <div className="bg-white rounded-2xl p-10 text-center shadow-card">
            <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-sans">暂无物资类目</p>
            <p className="text-gray-300 text-xs font-sans mt-1">点击上方按钮添加第一个类目</p>
          </div> : <div className="space-y-4">
            {Object.entries(groupedCategories).map(([mainCat, items], idx) => <div key={mainCat} className="bg-white rounded-2xl overflow-hidden shadow-card animate-fade-in-up" style={{
          animationDelay: `${idx * 0.08}s`
        }}>
                <div className="bg-gradient-to-r from-[#E8724A] to-[#F4A261] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-white" />
                    <h3 className="font-serif font-semibold text-white">{mainCat}</h3>
                    <span className="ml-auto text-xs text-white/70 font-sans">{items.length}种规格</span>
                  </div>
                </div>
                <div className="divide-y divide-[#F0E6D8]">
                  {items.map(item => <div key={item._id} className="flex items-center justify-between px-4 py-3 hover:bg-[#FFF8F0] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] flex items-center justify-center">
                          <Ruler size={14} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1B1B2F] font-sans">{item.subCategory}</p>
                          <p className="text-xs text-gray-400 font-sans">规格：{item.spec}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(item._id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all flex-shrink-0" title="删除">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>)}
                </div>
              </div>)}
          </div>}
      </div>
    </div>;
}