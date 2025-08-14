"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  HomeIcon,
  ChartBarIcon,
  UserGroupIcon,
  FolderIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const router = useRouter();
  const { t } = useTranslation("common");

  const menuItems = [
    {
      label: t("backToDashboard"),
      icon: HomeIcon,
      onClick: () => {
        router.push("/dashboard");
        onClose();
      },
      primary: true,
    },
    {
      label: t("reports"),
      icon: ChartBarIcon,
      onClick: () => {
        router.push("/dashboard/reports");
        onClose();
      },
    },
    {
      label: t("teams"),
      icon: UserGroupIcon,
      onClick: () => {
        router.push("/dashboard/teams");
        onClose();
      },
    },
    {
      label: t("projects"),
      icon: FolderIcon,
      onClick: () => {
        router.push("/dashboard/projects");
        onClose();
      },
    },
    {
      label: t("settings"),
      icon: Cog6ToothIcon,
      onClick: () => {
        router.push("/dashboard/settings");
        onClose();
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed top-0 left-0 h-full w-64 bg-white z-50 shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{t("menu")}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                  ${item.primary 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
