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
  Stethoscope
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
      "flex items-center w-full p-3 rounded-lg transition-all duration-200 group relative",
      active 
        ? "bg-slate-900 text-white shadow-lg shadow-slate-200/50" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-blue-400" : "group-hover:text-blue-500")} />
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
      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
        {label}
      </div>
    )}
  </button>
);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'professionals', label: 'Gestión Humana', icon: Users },
    { id: 'agenda', label: 'Operaciones', icon: Calendar },
    { id: 'finance', label: 'Finanzas', icon: Wallet },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? '80px' : '260px' }}
      className="h-screen bg-white border-r border-slate-100 flex flex-col relative"
    >
      <div className="p-6 flex items-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-blue-200 shadow-lg">
          <Stethoscope className="w-6 h-6" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 font-bold text-slate-900 text-lg leading-tight"
          >
            Neurometric<br /><span className="text-blue-600">LAB</span>
          </motion.div>
        )}
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
          className="flex items-center justify-center w-full p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
        <SidebarItem
          icon={LogOut}
          label="Cerrar Sesión"
          collapsed={isCollapsed}
          onClick={() => {}}
        />
      </div>
    </motion.div>
  );
};
