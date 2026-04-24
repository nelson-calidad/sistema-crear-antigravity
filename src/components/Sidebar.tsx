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
        ? 'bg-[#e4f3f4] text-slate-900 border-[#9dd8e3] shadow-sm'
        : 'text-slate-500 hover:bg-white hover:text-slate-900 border-transparent hover:border-[#e3d8c9]',
    )}
  >
    <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-cyan-700' : 'group-hover:text-cyan-700')} />
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
      <div className="absolute left-full ml-2 px-2 py-1 bg-white text-slate-700 text-xs rounded-lg border border-slate-200 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-xl">
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
}

export const Sidebar = ({ activeTab, setActiveTab, mobileOpen, onCloseMobile }: SidebarProps) => {
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
          'fixed inset-0 bg-[#f4ede3]/80 z-40 md:hidden transition-opacity',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-label="Cerrar navegación"
      />
      <motion.div
        animate={{ width: isCollapsed ? '80px' : '260px' }}
        className={cn(
          'h-screen bg-[#f6efe6] border-r border-[#e6dbcf] flex flex-col relative shadow-[0_0_36px_rgba(148,117,96,0.05)]',
          'fixed md:static inset-y-0 left-0 w-[280px] max-w-[85vw] md:w-auto z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'transition-transform duration-200 md:transition-none',
        )}
      >
        <div className="px-4 pt-5 pb-4 flex items-center mb-2">
          <div className={cn(
            'overflow-hidden bg-white border border-[#e8dfd6] shadow-md shadow-slate-200/40 ring-1 ring-white/60',
            isCollapsed ? 'w-14 h-14 rounded-2xl' : 'w-full h-20 rounded-[1.4rem]'
          )}>
            <img src={logoCrear} alt="Logo CREAR" className={cn('w-full h-full', isCollapsed ? 'object-cover' : 'object-contain p-2')} />
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
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center w-full p-3 text-slate-500 hover:text-slate-900 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-slate-200/70"
          >
            {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
          <SidebarItem icon={LogOut} label="Cerrar Sesión" collapsed={isCollapsed} onClick={() => {}} />
        </div>
      </motion.div>
    </>
  );
};
