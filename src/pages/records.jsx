// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Edit3, Trash2, Package, Search, AlertCircle, Clock, Loader2, Filter, Shield } from 'lucide-react';

import { NavBar } from '@/components/NavBar.jsx';
export default function RecordsPage(props) {
  const {
    $w
  } = props;
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const isAdmin = Boolean($w?.auth?.currentUser?.userId);
  useEffect(() => {
    loadAllRecords();
  }, []);
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredRecords(records);
      return;
    }
    const kw = searchText.trim().toLowerCase();
    setFilteredRecords(records.filter(r => {
      // Search by category name, donor, or registration time
      const catStr = `${r.category?.mainCategory || ''} ${r.category?.subCategory || ''} ${r.category?.thirdCategory || r.category?.spec || ''}`.toLowerCase();
      const donorStr = (r.donor || '').toLowerCase();
      const dateStr = r.createdAt ? r.createdAt.slice(0, 10) : '';
      if (filterType === 'category' && !catStr.includes(kw)) return false;
      if (filterType === 'donor' && !donorStr.includes(kw)) return false;
      if (filterType === 'date' && !dateStr.includes(kw)) return false;
      if (filterType === 'all' && !catStr.includes(kw) && !donorStr.includes(kw) && !dateStr.includes(kw)) return false;
      return true;
    }));
  }, [searchText, filterType, records]);
  const loadAllRecords = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('reports').get();
      const allRecords = (res.data || []).sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const db2 = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return db2 - da;
      });
      setRecords(allRecords);
      setFilteredRecords(allRecords);
    } catch (e) {
      console.error('Load records error:', e);
    } finally {
      setLoading(false);
    }
  };
  const startEdit = record => {
    setEditingId(record._id);
    setEditForm({
      quantityDisplay: record.quantityDisplay || '',
      pieces: record.pieces || 1,
      price: record.price,
      trackingNumber: record.trackingNumber || '',
      estimatedArrival: record.estimatedArrival || '',
      donor: record.donor || '',
      itemName: record.itemName || '',
      deliveryStatus: record.deliveryStatus || '待发货',
      note: record.note || ''
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  const saveEdit = async recordId => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('reports').doc(recordId).update({
        quantityDisplay: editForm.quantityDisplay,
        pieces: parseInt(editForm.pieces) || 1,
        price: parseFloat(editForm.price),
        trackingNumber: editForm.trackingNumber,
        deliveryStatus: editForm.deliveryStatus,
        estimatedArrival: editForm.estimatedArrival,
        donor: editForm.donor,
        itemName: editForm.itemName,
        note: editForm.note,
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
      setEditForm({});
      loadAllRecords();
    } catch (e) {
      console.error('Update error:', e);
      alert('修改失败，请重试');
    }
  };
  const deleteRecord = async recordId => {
    if (!window.confirm('确定要删除这条捐赠记录吗？')) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('reports').doc(recordId).remove();
      loadAllRecords();
    } catch (e) {
      console.error('Delete error:', e);
      alert('删除失败，请重试');
    }
  };
  const handleBack = () => {
    $w.utils.navigateBack();
  };
  const formatDate = dateStr => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  // 解析规格表达式，返回总数量（兼容历史数据：无 quantityDisplay 时回退到 quantity/pieces）
  const parseSpecTotal = record => {
    const display = record.quantityDisplay;
    if (display && display.trim()) {
      const parts = display.split('*').map(s => parseFloat(s.trim()) || 0);
      const total = parts.reduce((a, b) => a * b, 1);
      if (total > 0) return total;
    }
    return record.quantity || record.pieces || 0;
  };
  const filterOptions = [{
    value: 'all',
    label: '全部'
  }, {
    value: 'category',
    label: '类别名'
  }, {
    value: 'donor',
    label: '捐赠人'
  }, {
    value: 'date',
    label: '登记时间'
  }];
  return <div className="min-h-screen pb-8 bg-[#FFF8F0]">
      <NavBar title="捐赠记录" showBack onBack={handleBack} $w={$w} />

      <div className="mx-4 mt-4">
        {/* Search box with filter */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder={`按${filterOptions.find(f => f.value === filterType)?.label}搜索...`} className="w-full px-4 py-3 pl-10 rounded-2xl border border-[#F0E6D8] bg-white text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 focus:border-[#E8724A] transition-all" />
            {searchText && <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
          </div>
          <div className="relative">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-full px-3 py-3 rounded-2xl border border-[#F0E6D8] bg-white text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 appearance-none cursor-pointer">
              {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-[#E8724A]" /></div> : filteredRecords.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center shadow-card">
              <Package size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-sans">{searchText.trim() ? '未找到匹配的记录' : '暂无捐赠记录'}</p>
              {!searchText.trim() && <button onClick={() => $w.utils.navigateTo({
          pageId: 'fill'
        })} className="mt-4 px-5 py-2 rounded-full bg-[#E8724A] text-white text-sm font-medium shadow-button">去填报</button>}
            </div> : <>
              {searchText.trim() && <p className="text-xs text-gray-500 mb-3 font-sans">找到 {filteredRecords.length} 条记录</p>}
              <div className="space-y-3">
                {filteredRecords.map((record, idx) => <div key={record._id} className="bg-white rounded-2xl p-4 shadow-card" style={{
            animationDelay: `${idx * 0.05}s`
          }}>
                    {editingId === record._id ?
            // Edit mode - admin only
            <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 font-sans">规格（支持算式如 "24*500"）</label>
                            <input type="text" value={editForm.quantityDisplay} onChange={e => setEditForm({
                    ...editForm,
                    quantityDisplay: e.target.value
                  })} className="w-full px-3 py-2 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 font-sans">件数</label>
                            <input type="number" min="1" value={editForm.pieces} onChange={e => setEditForm({
                    ...editForm,
                    pieces: parseInt(e.target.value) || 1
                  })} className="w-full px-3 py-2 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 font-sans">单价</label>
                            <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({
                    ...editForm,
                    price: e.target.value
                  })} placeholder="请输入每件的单价" className="w-full px-3 py-2 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-sans">捐赠人</label>
                          <input type="text" value={editForm.donor} onChange={e => setEditForm({
                  ...editForm,
                  donor: e.target.value
                })} className="w-full px-3 py-2 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 font-sans">快递单号</label>
                            <input type="text" value={editForm.trackingNumber} onChange={e => setEditForm({
                    ...editForm,
                    trackingNumber: e.target.value
                  })} className="w-full px-3 py-2 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 font-sans">预计到达</label>
                            <input type="date" value={editForm.estimatedArrival} onChange={e => setEditForm({
                    ...editForm,
                    estimatedArrival: e.target.value
                  })} className="w-full px-3 py-2 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-sans">快递签收状态</label>
                          <div className="flex gap-2">
                            {['待发货', '已发货', '已签收'].map(s => <button key={s} type="button" onClick={() => setEditForm({
                    ...editForm,
                    deliveryStatus: s
                  })} className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all ${editForm.deliveryStatus === s ? 'bg-[#2D6A4F] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>)}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-sans">备注</label>
                          <textarea value={editForm.note} onChange={e => setEditForm({
                  ...editForm,
                  note: e.target.value
                })} rows={2} className="w-full px-3 py-2 rounded-xl border border-[#F0E6D8] bg-[#FFFBF5] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#E8724A]/30 resize-none" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveEdit(record._id)} className="flex-1 py-2.5 rounded-xl bg-[#E8724A] text-white text-sm font-medium hover:bg-[#D4633F] transition-all">保存</button>
                          <button onClick={cancelEdit} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all">取消</button>
                        </div>
                      </div> :
            // Display mode
            <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-serif font-semibold text-[#1B1B2F]">{record.donor || '匿名捐赠'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFE8D6] text-[#E8724A] text-xs font-sans"><Package size={10} /> {record.category?.subCategory || record.category?.mainCategory || '未分类'}</span>
                              {record.category?.thirdCategory && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF8E1] text-amber-700 text-xs font-sans">{record.category.thirdCategory}</span>}
                              {record.category?.spec && !record.category?.thirdCategory && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF8E1] text-amber-700 text-xs font-sans">{record.category.spec}</span>}
                              {record.quantityDisplay && <span className="text-xs text-gray-400 font-sans">规格：{record.quantityDisplay}</span>}
                              {record.pieces != null && <span className="text-xs text-gray-400 font-sans">件数：{record.pieces}</span>}
                            </div>
                            <div className="mt-2 space-y-1">
                              {record.server && <p className="text-xs text-gray-500 font-sans">区服：{record.server}</p>}
                              {record.itemName && <p className="text-xs text-gray-500 font-sans">📦 {record.itemName}</p>}
                              {record.trackingNumber && <p className="text-xs text-gray-500 font-sans">快递单号：{record.trackingNumber}</p>}
                              {record.deliveryStatus && <p className={`text-xs font-sans ${record.deliveryStatus === '已签收' ? 'text-green-600' : record.deliveryStatus === '已发货' ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {record.deliveryStatus === '待发货' && '📦 '}{record.deliveryStatus === '已发货' && '🚚 '}{record.deliveryStatus === '已签收' && '✅ '}状态：{record.deliveryStatus}
                                </p>}
                              {record.estimatedArrival && <div className="flex items-center gap-1 text-xs text-gray-500 font-sans"><Clock size={10} /> 预计：{formatDate(record.estimatedArrival)}</div>}
                              {record.note && <p className="text-xs text-gray-400 font-sans italic">🗒️ {record.note}</p>}
                            </div>
                            <p className="text-xs text-gray-400 mt-2 font-sans">登记时间：{formatDate(record.createdAt)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-3">
                            <p className="text-lg font-bold text-[#2D6A4F] font-serif">¥{((record.price || 0) * (record.pieces || 1)).toFixed(0)}</p>
                            {isAdmin && <div className="flex gap-1.5">
                                <button onClick={() => startEdit(record)} className="w-8 h-8 rounded-lg bg-[#FFF0E6] flex items-center justify-center hover:bg-[#FFE0CC] transition-all" title="编辑"><Edit3 size={14} className="text-[#E8724A]" /></button>
                                <button onClick={() => deleteRecord(record._id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all" title="删除"><Trash2 size={14} className="text-red-500" /></button>
                              </div>}
                          </div>
                        </div>
                        {!isAdmin && <div className="mt-3 pt-2 border-t border-[#F0E6D8] flex items-center gap-1.5 text-xs text-gray-400 font-sans">
                            <Shield size={12} /> 当前仅可查看
                          </div>}
                      </>}
                  </div>)}
              </div>
            </>}
      </div>
    </div>;
}