// @ts-ignore;
import React, { useState, useEffect } from 'react';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const tcb = await $w.cloud.getCloudInstance();
        const loginState = await tcb.auth().getLoginState();
        if (loginState) {
          await $w.auth.getUserInfo({
            force: true
          });
          setCurrentUser($w.auth.currentUser);
        }
      } catch (e) {
        console.error('Auth check error:', e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);
  const navigateTo = ({
    pageId,
    params = {}
  }) => {
    setPageParams(prev => ({
      ...prev,
      ...params
    }));
    setCurrentPage(pageId);
  };
  const redirectTo = ({
    pageId,
    params = {}
  }) => {
    setPageParams(params);
    setCurrentPage(pageId);
  };
  const navigateBack = () => {
    setCurrentPage('home');
    setPageParams({});
  };
  const $wExtended = {
    auth: {
      currentUser: currentUser,
      getUserInfo: async opts => {
        const tcb = await $w.cloud.getCloudInstance();
        const user = await tcb.auth().getLoginState();
        if (user) {
          setCurrentUser({
            userId: user.uid || user.openid,
            name: user.nickName || '志愿者',
            nickName: user.nickName,
            avatarUrl: user.avatarUrl,
            type: user.loginType || 'anonymous'
          });
        }
        return $wExtended.auth.currentUser;
      }
    },
    utils: {
      navigateTo,
      redirectTo,
      navigateBack,
      resolveStaticResourceUrl: url => url
    },
    page: {
      dataset: {
        params: pageParams
      }
    },
    cloud: {
      callFunction: $w.cloud.callFunction,
      getCloudInstance: $w.cloud.getCloudInstance
    }
  };
  const renderPage = () => {
    const props = {
      className: '',
      style: {},
      $w: $wExtended
    };
    switch (currentPage) {
      case 'home':
        {
          const HomePage = React.lazy(() => import('./pages/home.jsx'));
          return <HomePage {...props} />;
        }
      case 'fill':
        {
          const FillPage = React.lazy(() => import('./pages/fill.jsx'));
          return <FillPage {...props} />;
        }
      case 'records':
        {
          const RecordsPage = React.lazy(() => import('./pages/records.jsx'));
          return <RecordsPage {...props} />;
        }
      case 'categories':
        {
          const CategoriesPage = React.lazy(() => import('./pages/categories.jsx'));
          return <CategoriesPage {...props} />;
        }
      case 'statistics':
        {
          const StatisticsPage = React.lazy(() => import('./pages/statistics.jsx'));
          return <StatisticsPage {...props} />;
        }
      default:
        return <div className="p-8 text-center text-gray-500">页面不存在</div>;
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#FFF8F0]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-sans">加载中...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-[#FFF8F0] max-w-lg mx-auto relative">
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>}>
        {renderPage()}
      </React.Suspense>
    </div>;
}
export default App;