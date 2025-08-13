"use client";

import React, { useEffect, useRef, useState } from "react";

type ButtonVariant = "primary" | "success" | "neutral";

interface MenuAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  iconText?: string; // Mostra avatar com a inicial
  iconBg?: string; // cor do avatar
  badges?: React.ReactNode[]; // chips à direita

  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: ButtonVariant;
  };

  menuActions?: MenuAction[]; // agrupadas no dropdown "Mais"
}

function variantClasses(variant: ButtonVariant = "primary"): string {
  switch (variant) {
    case "success":
      return "bg-green-600 hover:bg-green-700 text-white";
    case "neutral":
      return "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50";
    default:
      return "bg-blue-600 hover:bg-blue-700 text-white";
  }
}

export default function PageHeader({
  title,
  subtitle,
  iconText,
  iconBg = "#3B82F6",
  badges = [],
  primaryAction,
  menuActions = [],
}: PageHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {iconText && (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center ring-1 ring-white/40 shadow-sm shrink-0"
                style={{ backgroundColor: iconBg }}
              >
                <span className="text-lg font-semibold text-white">{iconText.toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {badges.map((b, i) => (
              <span key={i}>{b}</span>
            ))}

            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className={`hidden md:inline-flex items-center px-3 py-2 text-sm rounded-md shadow ${variantClasses(
                  primaryAction.variant || "primary"
                )}`}
              >
                {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                {primaryAction.label}
              </button>
            )}

            {(menuActions.length > 0 || primaryAction) && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                  Ações
                  <svg className="w-4 h-4 ml-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.167l3.71-3.936a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-10">
                    <div className="py-1">
                      {primaryAction && (
                        <button
                          onClick={() => {
                            setOpen(false);
                            primaryAction.onClick();
                          }}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            primaryAction.variant === "neutral" ? "text-gray-700" : "text-gray-800"
                          } hover:bg-gray-50`}
                        >
                          {primaryAction.label}
                        </button>
                      )}
                      {menuActions.map((a, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setOpen(false);
                            a.onClick();
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            a.destructive ? "text-red-600" : "text-gray-800"
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

