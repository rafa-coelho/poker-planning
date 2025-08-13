'use client';

import "@/i18n/index";
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { UserRole } from '@/lib/auth/roles';

export default function EditUserPage() {
  const { t } = useTranslation('dashboard');
  const router = useRouter();
  const params = useParams();
  const { apiService } = useAuth();
  const userId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.MEMBER as UserRole,
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiService.get(`/api/users/${userId}`);
        if (res.success && res.data) {
          const u = (res.data as any).user;
          setFormData({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
        } else {
          setError(t('users.errors.loadUser'));
        }
      } catch (e) {
        setError(t('users.errors.loadUser'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiService, t, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiService.updateUser(userId, {
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive
      });
      if (res.success) {
        router.push(`/dashboard/users/${userId}`);
      } else {
        setError(res.error?.message || t('users.errors.updateUser'));
      }
    } catch (e) {
      setError(t('users.errors.updateUser'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('users.edit')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('users.description')}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {t('quickActions.backToList')}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.form.name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('users.form.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.form.email')}</label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.form.role')}</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value={UserRole.MEMBER}>{t('users.roles.MEMBER')}</option>
              <option value={UserRole.ADMIN}>{t('users.roles.ADMIN')}</)}</option>
              <option value={UserRole.VIEWER}>{t('users.roles.VIEWER')}</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">{t('users.form.isActive')}</label>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('users.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? t('users.form.updating') : t('users.form.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

