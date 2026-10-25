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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  Sun,
  Moon,
  MessageCircle,
  ClipboardList,
  DoorOpen,
  LogOut,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { readStoredValue, writeStoredValue } from '../lib/browserStorage';
import { motion, AnimatePresence } from 'motion/react';
import logoCrear from '../assets/logo-crear-mobile.jpg';
import { useAuth, logoutUser } from '../lib/crearAuth';

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
      'flex items-center w-full p-2.5 rounded-xl transition-all duration-200 group relative border',
      active
        ? 'bg-[#DDEAE2] text-[#34433F] border-[#D2E2D9] shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
        : 'text-[#6D7C76] hover:bg-[#F1F3EF] hover:text-[#34433F] border-transparent dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100',
    )}
  >
    <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-[#34433F] dark:text-slate-100' : 'group-hover:text-slate-700 dark:group-hover:text-slate-300')} />
    <AnimatePresence>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="ml-2.5 text-xs font-semibold whitespace-nowrap overflow-hidden"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
    {collapsed && (
      <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-xl whitespace-nowrap">
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
  onOpenPortal?: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, mobileOpen, onCloseMobile, theme, onToggleTheme, onOpenPortal }: SidebarProps) => {
  const authUser = useAuth();
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (activeTab === 'agenda') return true;
    return readStoredValue('crear-sidebar-compact') === 'true';
  });
  const [isHidden, setIsHidden] = React.useState(() => readStoredValue('crear-sidebar-hidden') === 'true');

  React.useEffect(() => { writeStoredValue('crear-sidebar-compact', String(isCollapsed)); }, [isCollapsed]);
  React.useEffect(() => { writeStoredValue('crear-sidebar-hidden', String(isHidden)); }, [isHidden]);

  // Si entra a Agenda en desktop, colapsar automáticamente para maximizar el ancho de la grilla
  React.useEffect(() => {
    if (activeTab === 'agenda' && !isMobile) {
      setIsCollapsed(true);
    }
  }, [activeTab, isMobile]);
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'admissions', label: 'Consultas y Admisiones', icon: MessageCircle },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'rooms', label: 'Consultorios', icon: DoorOpen },
    { id: 'professionals', label: 'Profesionales', icon: Users },
    { id: 'finance', label: 'Finanzas', icon: Wallet },
    { id: 'responsibilities', label: 'Responsabilidades', icon: ClipboardList },
    { id: 'coverage', label: 'Guardias CREAR', icon: CalendarDays },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const effectiveCollapsed = isMobile ? false : isCollapsed;

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
      {isHidden && <div className="fixed inset-y-0 left-0 z-[70] hidden w-12 md:block" onMouseEnter={() => setIsHidden(false)}>
        <button
          type="button"
          onFocus={() => setIsHidden(false)}
          onClick={() => setIsHidden(false)}
          className="absolute left-0 top-1/2 flex h-20 w-10 -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-slate-200 bg-white text-slate-600 shadow-lg transition hover:w-12 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          title="Mostrar menú"
          aria-label="Mostrar menú"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      </div>}
      <motion.div
        animate={isMobile ? { width: '280px' } : { width: isHidden ? '0px' : isCollapsed ? '68px' : '230px' }}
        className={cn(
          'h-screen overflow-hidden bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col relative',
          'fixed md:static inset-y-0 left-0 w-[280px] max-w-[85vw] md:w-auto z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'transition-transform duration-200 md:transition-none',
        )}
      >
        <div className="px-3 pt-3.5 pb-2 flex items-center mb-1">
          <div className={cn(
            'overflow-hidden flex items-center justify-center transition-all duration-200 bg-white rounded-xl dark:bg-white',
            effectiveCollapsed ? 'w-10 h-10 p-1' : 'w-full h-12 p-1.5'
          )}>
            <img src={logoCrear} alt="Logo CREAR" className="w-full h-full object-contain" />
          </div>
        </div>

        <nav className="flex-1 px-2.5 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              collapsed={effectiveCollapsed}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        {/* Opción clara de Modo Oscuro / Claro en el menú */}
        <div className="px-2.5 pb-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-xs font-semibold transition border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700",
              effectiveCollapsed ? "justify-center px-1" : "justify-between"
            )}
            title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              )}
              {!effectiveCollapsed && (
                <span className="truncate">Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
              )}
            </div>
            {!effectiveCollapsed && (
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-black shrink-0",
                theme === 'dark' ? "bg-amber-400/20 text-amber-300" : "bg-indigo-50 text-indigo-600"
              )}>
                {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            )}
          </button>
        </div>

        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
          {authUser && (
            <div className={cn(
              "flex items-center gap-2 mb-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs",
              effectiveCollapsed ? "justify-center" : "justify-between"
            )}>
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#46766B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {authUser.name?.charAt(0) || 'U'}
                </div>
                {!effectiveCollapsed && (
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{authUser.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize truncate">{authUser.role}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => logoutUser()}
                title="Cerrar sesión"
                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-1 w-full">
            <button
              onClick={onToggleTheme}
              className="flex-1 flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title={`Activar modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            <button
              onClick={() => setIsHidden(true)}
              className="hidden flex-1 items-center justify-center p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:flex rounded-xl"
              title="Ocultar menú"
              aria-label="Ocultar menú"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex flex-1 items-center justify-center p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};
