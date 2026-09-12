import { ReactNode, useRef, useEffect } from "react";

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "", ariaLabel }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    if (activeIndex >= 0 && tabRefs.current[activeIndex]) {
      tabRefs.current[activeIndex]?.focus();
    }
  }, [activeTab, tabs]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        newIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    if (!tabs[newIndex].disabled) {
      onChange(tabs[newIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-1 overflow-x-auto ${className}`}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => { tabRefs.current[index] = el; }}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          aria-disabled={tab.disabled}
          tabIndex={activeTab === tab.id ? 0 : -1}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`
            flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap
            border-b-2 transition-colors
            ${activeTab === tab.id
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300"
            }
            ${tab.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`
              px-1.5 py-0.5 text-[10px] font-medium rounded-full
              ${activeTab === tab.id
                ? "bg-blue-400 text-blue-900"
                : "bg-slate-700 text-slate-300"
              }
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className = "" }: TabPanelProps) {
  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
