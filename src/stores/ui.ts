import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * UI 状态 Store - 持久化 UI 相关状态
 */
export const useUIStore = defineStore('ui', () => {
  // 侧边栏是否折叠
  const sidebarCollapsed = ref(false);
  
  // 当前激活的菜单项
  const activeMenu = ref('prompt');
  
  // 设置侧边栏折叠状态
  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed;
  };
  
  // 切换侧边栏折叠状态
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };
  
  // 设置当前激活的菜单
  const setActiveMenu = (menu: string) => {
    activeMenu.value = menu;
  };

  return {
    sidebarCollapsed,
    activeMenu,
    setSidebarCollapsed,
    toggleSidebar,
    setActiveMenu,
  };
}, {
  persist: true, // 启用持久化
});
