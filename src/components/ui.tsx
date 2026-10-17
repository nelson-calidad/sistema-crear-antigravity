import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';

export const cardClass = 'rounded-2xl border border-[#E5EAE5] bg-white p-4 shadow-[0_8px_28px_rgba(52,67,63,0.045)] sm:p-5 dark:border-slate-800 dark:bg-slate-900';
export const fieldClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-[#DDE3DF] bg-white px-3 py-2.5 text-base text-[#34433F] outline-none transition placeholder:text-[#98A39E] focus:border-[#46766B] focus:ring-2 focus:ring-[#DDEAE2] disabled:bg-[#F1F3EF] sm:text-sm';

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight text-[#34433F] sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-[#6D7C76]">{description}</p></div>{action}</header>;
}

export function Button({ tone = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'quiet' }) {
  const tones = { primary: 'bg-[#46766B] text-white hover:bg-[#3B675D]', secondary: 'border border-[#D7DFDA] bg-white text-[#34433F] hover:bg-[#F1F3EF]', quiet: 'text-[#46766B] hover:bg-[#DDEAE2]' };
  return <button {...props} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`} />;
}

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-sm font-medium text-[#4C5B56]">{label}<input {...props} className={`${fieldClass} ${props.className || ''}`} /></label>;
}

export function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-[#4C5B56]">{label}<select {...props} className={`${fieldClass} ${props.className || ''}`}>{children}</select></label>;
}

export function StatCard({ label, value, detail, tone = 'sage', onClick }: { label: string; value: ReactNode; detail?: string; tone?: 'sage' | 'blue' | 'peach' | 'lavender'; onClick?: () => void }) {
  const tones = { sage: 'bg-[#DDEAE2]', blue: 'bg-[#E4EFF1]', peach: 'bg-[#F6E9DB]', lavender: 'bg-[#EEEAF4]' };
  const body = <><p className="text-sm font-medium text-[#5D6D67]">{label}</p><strong className="mt-2 block text-2xl font-semibold tracking-tight text-[#34433F]">{value}</strong>{detail && <p className="mt-1 text-xs text-[#6D7C76]">{detail}</p>}</>;
  return onClick ? <button onClick={onClick} className={`min-h-32 rounded-2xl border border-white/70 p-4 text-left shadow-[0_6px_22px_rgba(52,67,63,.04)] transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone]}`}>{body}</button> : <div className={`min-h-32 rounded-2xl border border-white/70 p-4 ${tones[tone]}`}>{body}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className={`${cardClass} py-9 text-center`}><p className="font-semibold text-[#34433F]">{title}</p><p className="mx-auto mt-1 max-w-md text-sm text-[#6D7C76]">{detail}</p></div>; }
export function LoadingState({ label = 'Cargando información…' }: { label?: string }) { return <div className={`${cardClass} flex items-center justify-center gap-2 py-9 text-sm text-[#6D7C76]`}><LoaderCircle className="h-4 w-4 animate-spin" />{label}</div>; }
export function ErrorMessage({ children }: { children: ReactNode }) { return <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{children}</p>; }
export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) { return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#24332E]/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true"><section className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#F9F8F5] p-5 shadow-2xl sm:rounded-3xl sm:p-6"><header className="sticky top-0 z-10 mb-5 flex items-center justify-between bg-[#F9F8F5] pb-2"><h2 className="text-xl font-semibold">{title}</h2><Button tone="quiet" onClick={onClose}>Cerrar</Button></header>{children}{footer && <footer className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-[#E5EAE5] bg-[#F9F8F5] pt-4">{footer}</footer>}</section></div>; }
