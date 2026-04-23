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
      "flex items-center w-full p-3 rounded-2xl transition-all duration-200 group relative border",
      active 
        ? "bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-lavender-500/10 text-slate-900 border-cyan-200 shadow-lg shadow-cyan-200/15" 
        : "text-slate-500 hover:bg-white/60 hover:text-slate-900 border-transparent hover:border-slate-200/70"
    )}
  >
    <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-blue-600" : "group-hover:text-blue-500")} />
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
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-950 text-white text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-xl">
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
          "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-label="Cerrar navegación"
      />
      <motion.div
        animate={{ width: isCollapsed ? '80px' : '260px' }}
        className={cn(
          "h-screen bg-slate-950/35 border-r border-white/10 backdrop-blur-xl flex flex-col relative",
          "fixed md:static inset-y-0 left-0 w-[280px] max-w-[85vw] md:w-auto z-50 md:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "transition-transform duration-200 md:transition-none"
        )}
      >
      <div className="p-6 flex items-center mb-4">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-lavender-500 flex items-center justify-center text-white shadow-lg shadow-cyan-200/20 ring-1 ring-white/15">
          <Stethoscope className="w-6 h-6" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 font-black text-slate-900 text-lg leading-tight"
          >
            Neurometric<br /><span className="text-cyan-600">LAB</span>
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
          className="flex items-center justify-center w-full p-3 text-slate-400 hover:text-slate-900 hover:bg-white/60 rounded-2xl transition-colors border border-transparent hover:border-slate-200/70"
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
    </>
  );
};
