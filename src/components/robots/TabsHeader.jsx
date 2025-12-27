// src/components/robots/TabsHeader.jsx
import React from "react";

/**
 * TabsHeader: modern dashboard-style tabs
 * props:
 *  - tabs: [{id,label}] 
 *  - active: id
 *  - onChange: fn(id)
 *  - accent: 'main' | 'second'
 */
export default function TabsHeader({ tabs = [], active, onChange, accent = "main" }) {
  const accentColor =
    accent === "main"
      ? "var(--color-main-color)"
      : "var(--color-second-color)";

  return (
    <div className="w-full border-b border-gray-200 flex flex-wrap">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative px-5 max-md:px-2 max-md:py-1 py-2 text-sm font-medium   transition-colors duration-200 
              ${isActive ? "text-main-color" : "text-gray-500 hover:text-gray-700"}`}
            style={{
              borderBottom: isActive ? `3px solid ${accentColor}` : "3px solid transparent",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
