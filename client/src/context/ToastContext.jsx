import { createContext, useCallback, useContext, useState } from 'react';
import { CircleAlert, CircleCheck, Sparkles, Info } from 'lucide-react';

const ToastCtx = createContext(() => {});
const ICONS = { success: CircleCheck, error: CircleAlert, ai: Sparkles, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const toast = useCallback((message, { type = 'success', action, duration = 4200 } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, message, type, action }]);
    setTimeout(() => dismiss(id), duration);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast--${t.type}`}>
              <Icon />
              <span>{t.message}</span>
              {t.action && <button onClick={() => { t.action.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
