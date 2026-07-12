// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Plus, Edit3, Trash2, X, Save, AlertCircle, Loader2 } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function DonationSuggestionsPage(props) {
  const {
    $w
  } = props;
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    loadSuggestions();
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
  const handleSave = async () => {
    const content = formContent.trim();
    if (!content) {
      setError('请输入建议类别内容');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      if (editItem) {
        await db.collection('suggestions').doc(editItem._id).update({
          content,
          updatedAt: new Date().toISOString()
        });
      } else {
        await db.collection('suggestions').add({
          content,
          createdAt: new Date().toISOString(),
          createdBy: $w?.auth?.currentUser?.userId || ''
        });
      }
      setFormContent('');
      setEditItem(null);
      setShowForm(false);
      await loadSuggestions();
    } catch (e) {
      console.error('Save suggestion error:', e);
      setError('保存失败，请检查数据库权限或联系管理员');
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = item => {
    setEditItem(item);
    setFormContent(item.content || '');
    setShowForm(true);
    setError('');
  };
  const handleDelete = async id => {
    if (!window.confirm('确定要删除此建议类别？')) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('suggestions').doc(id).remove();
      await loadSuggestions();
    } catch (e) {
      console.error('Delete suggestion error:', e);
      alert('删除失败');
    }
  };
  const openAddForm = () => {
    setEditItem(null);
    setFormContent('');
    setError('');
    setShowForm(true);
  };
  const cancelForm = () => {
    setShowForm(false);
    setEditItem(null);
    setFormContent('');
    setError('');
  };
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
              此处管理统计看板中「建议捐赠类别」模块的内容。添加的建议类别将展示给所有用户参考，帮助志愿者了解当前急需哪些物资。请填写清晰、具体的类别名称，例如「饮用水（500ml装）」或「夏季衣物（短袖）」。
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
        <textarea value={formContent} onChange={e => {
          setFormContent(e.target.value);
          setError('');
        }} placeholder="请输入建议捐赠类别内容，例如：矿泉水（500ml装）" rows={3} className="w-full px-4 py-3 rounded-xl border border-[#F0E6D8] bg-[#FFF8F0] text-sm font-sans text-[#1B1B2F] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all resize-none" />
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
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#E8724A] to-[#F4A261] flex items-center justify-center text-white text-xs font-medium shrink-0">{idx + 1}</span>
                    <p className="text-sm font-sans text-[#1B1B2F] leading-relaxed">{item.content}</p>
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