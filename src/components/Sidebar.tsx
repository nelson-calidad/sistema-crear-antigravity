/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import logoCrear from '../assets/logo-crear.png';

interface SidebarItemProps {
  key?: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, collapsed, onClick }: SidebarItemProps) => (
  <button
    id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
    onClick={onClick}
    className={cn(
      'flex items-center w-full p-3 rounded-2xl transition-all duration-200 group relative border',
      active
        ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100',
    )}
  >
    <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-slate-900 dark:text-slate-100' : 'group-hover:text-slate-700 dark:group-hover:text-slate-300')} />
    <AnimatePresence>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="ml-3 font-medium whitespace-nowrap overflow-hidden"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
    {collapsed && (
      <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-xl">
        {label}
      </div>
    )}
  </button>
);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, mobileOpen, onCloseMobile, theme, onToggleTheme }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'professionals', label: 'Gestión Humana', icon: Users },
    { id: 'agenda', label: 'Operaciones', icon: Calendar },
    { id: 'finance', label: 'Finanzas', icon: Wallet },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      <button
        type="button"
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 bg-slate-900/20 z-40 md:hidden transition-opacity',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-label="Cerrar navegación"
      />
      <motion.div
        animate={{ width: isCollapsed ? '80px' : '260px' }}
        className={cn(
          'h-screen bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col relative',
          'fixed md:static inset-y-0 left-0 w-[280px] max-w-[85vw] md:w-auto z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'transition-transform duration-200 md:transition-none',
        )}
      >
        <div className="px-4 pt-5 pb-4 flex items-center mb-2">
          <div className={cn(
            'overflow-hidden flex items-center justify-center transition-all duration-200 bg-white rounded-xl dark:bg-white',
            isCollapsed ? 'w-10 h-10 p-1' : 'w-full h-16 p-2'
          )}>
            <img src={logoCrear} alt="Logo CREAR" className="w-full h-full object-contain" />
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              collapsed={isCollapsed}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="flex gap-2 w-full mb-2">
            <button
              onClick={onToggleTheme}
              className="flex-1 flex items-center justify-center p-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors border border-transparent hover:border-slate-200/70 dark:hover:border-slate-700"
              title={`Activar modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex-1 flex items-center justify-center p-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors border border-transparent hover:border-slate-200/70 dark:hover:border-slate-700"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
          <SidebarItem icon={LogOut} label="Cerrar Sesión" collapsed={isCollapsed} onClick={() => {}} />
        </div>
      </motion.div>
    </>
  );
};
