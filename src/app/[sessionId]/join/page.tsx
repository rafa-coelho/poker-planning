"use client";

import "@/i18n/index";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePublicAuth } from '@/lib/hooks/usePublicAuth';
import { Toaster, toast } from 'react-hot-toast';
import { PublicParticipantRequest, PublicParticipantResponse } from '@/types/publicAccess';

interface RequestStatus {
  status: 'pending' | 'approved' | 'rejected' | 'checking';
  message: string;
  participantId?: string;
  authToken?: string;
  tempToken?: string;
}

export default function JoinSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { t } = useTranslation('sessions');
  const { isAuthenticated, isLoading, apiService } = useAuth();
  const { setPublicParticipant } = usePublicAuth();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessForm, setAccessForm] = useState<PublicParticipantRequest>({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  

  // Load saved status from localStorage
  useEffect(() => {
    console.log('Loading saved status from localStorage...');
    const savedStatus = localStorage.getItem(`publicAccess_${sessionId}`);
    console.log('savedStatus:', savedStatus);
    
    if (savedStatus) {
      try {
        const parsed = JSON.parse(savedStatus);
        console.log('Parsed status:', parsed);
        setRequestStatus(parsed);
        
        // If approved, redirect
        if (parsed.status === 'approved') {
          console.log('Status approved, redirecting...');
          router.push(`/${sessionId}`);
          return;
        }
        
        // If rejected, clear from localStorage
        if (parsed.status === 'rejected') {
          console.log('Status rejected, clearing...');
          localStorage.removeItem(`publicAccess_${sessionId}`);
          setRequestStatus(null);
        }
      } catch (e) {
        console.error('Error parsing saved status:', e);
        localStorage.removeItem(`publicAccess_${sessionId}`);
      }
    } else {
      console.log('No saved status found');
    }
  }, [sessionId, router]);

  

  // Check session permission for logged user
  const checkSessionPermission = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dataResp = await apiService.getPublicAccess(sessionId);

      if (dataResp.success && dataResp.data) {
        // Check if session is ended
        if (dataResp.data.status === 'COMPLETED' || dataResp.data.status === 'ARCHIVED' || dataResp.data.status === 'CANCELLED') {
          console.log('Ended session detected in permission check:', dataResp.data.status);
          router.push(`/${sessionId}/ended`);
          return;
        }
        
        if (dataResp.data.currentUser.hasAccess) {
          // User has access - redirect to session
          router.push(`/${sessionId}`);
        } else {
          setError('noAccessToSession');
        }
      } else {
        setError('sessionNotFound');
      }
    } catch (err) {
      setError('sessionNotFound');
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  // Load session data for non-logged user
  const loadSessionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const resp = await apiService.getPublicAccess(sessionId);

      if (resp.success && resp.data) {
        // Check if session is ended
        if (resp.data.status === 'COMPLETED' || resp.data.status === 'ARCHIVED' || resp.data.status === 'CANCELLED') {
          console.log('Ended session detected in join page:', resp.data.status);
          router.push(`/${sessionId}/ended`);
          return;
        }
        
        setSessionData(resp.data);
      } else {
        setError('sessionNotFound');
      }
    } catch (err) {
      setError('sessionNotFound');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Check request status
  const checkRequestStatus = useCallback(async () => {
    console.log('checkRequestStatus executed');
    console.log('requestStatus:', requestStatus);
    
    if (!requestStatus?.participantId) {
      console.log('checkRequestStatus: No participantId');
      return;
    }

    try {
      console.log('Starting status check...');
      
      // Only change to 'checking' if not already 'checking'
      if (requestStatus.status !== 'checking') {
        setRequestStatus(prev => ({ ...prev!, status: 'checking' }));
      }

      // Use the new status API that accepts public participant tokens
      const tokenToUse = requestStatus.authToken || requestStatus.tempToken || '';
      console.log('Token to use:', tokenToUse ? 'YES' : 'NO');
      
      const resp = await apiService.getPublicParticipantStatus(
        sessionId,
        requestStatus.participantId,
        tokenToUse
      );

      console.log('API response:', resp);

      if (resp.success && resp.data) {
        const participant = resp.data;
        console.log('Participant status:', participant.status);
        
        if (participant.status === 'APPROVED') {
          console.log('Guest was approved!');
          const message = t('join.approvedRedirecting');
          const newStatus = {
            status: 'approved' as const,
            message,
            participantId: requestStatus.participantId,
            authToken: participant.authToken || requestStatus.authToken
          };
          
          setRequestStatus(newStatus);
          
          localStorage.setItem(`publicAccess_${sessionId}`, JSON.stringify(newStatus));
          
          toast.success(t('permissionApproved'));
          
          // Save public authentication token
          if (participant.authToken) {
            setPublicParticipant(participant.authToken);
          }
          
          // Redirect will be handled by separate useEffect
        } else if (participant.status === 'REJECTED') {
          console.log('Guest was rejected!');
          const message = t('join.rejectedMessage');
          setRequestStatus({
            status: 'rejected',
            message,
            participantId: requestStatus.participantId
          });
          
          localStorage.removeItem(`publicAccess_${sessionId}`);
          
          toast.error(t('permissionRejected'));
        } else {
          console.log('Status still pending:', participant.status);
          // Return to 'pending' if still pending
          if (requestStatus.status === 'checking') {
            setRequestStatus(prev => ({ ...prev!, status: 'pending' }));
          }
        }
      } else {
        console.log('API response was not successful:', resp);
        // Return to 'pending' on error
        if (requestStatus.status === 'checking') {
          setRequestStatus(prev => ({ ...prev!, status: 'pending' }));
        }
      }
    } catch (err) {
      console.error('Error checking status:', err);
      // Return to 'pending' on error
      if (requestStatus.status === 'checking') {
        setRequestStatus(prev => ({ ...prev!, status: 'pending' }));
      }
    }
  }, [requestStatus, sessionId, router, t, setPublicParticipant]);

  // Periodic polling to check request status (without WebSocket)
  useEffect(() => {
    console.log('Polling useEffect executed');
    console.log('requestStatus?.status:', requestStatus?.status);
    console.log('requestStatus?.participantId:', requestStatus?.participantId);
    
    // Polling should continue while status is 'pending' or 'checking'
    if ((requestStatus?.status === 'pending' || requestStatus?.status === 'checking') && requestStatus.participantId) {
      console.log('Starting polling for guest:', requestStatus.participantId);
      
      // Only set up interval, no immediate call
      const interval = setInterval(() => {
        console.log('Executing polling...');
        checkRequestStatus();
      }, 3000); // Reduced to 2 seconds for testing

      return () => {
        console.log('Clearing polling interval');
        clearInterval(interval);
      };
    } else {
      console.log('Polling not started - status:', requestStatus?.status, 'participantId:', requestStatus?.participantId);
    }
  }, [requestStatus?.status, requestStatus?.participantId, checkRequestStatus]);

  // Separate effect for redirect when approved
  useEffect(() => {
    if (requestStatus?.status === 'approved') {
      router.push(`/${sessionId}`);
    }
  }, [requestStatus?.status, sessionId, router]);

  // Initialize authentication check
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Logged user - check permission for session
        checkSessionPermission();
      } else {
        // Non-logged user - load session data to show options
        loadSessionData();
      }
    }
  }, [isAuthenticated, isLoading]);

  // Redirect to login with redirect to session
  const handleLogin = () => {
    router.push(`/login?redirect=/${sessionId}`);
  };

  // Request access as guest
  const handleAccessRequest = async () => {
    console.log('handleAccessRequest executed');
    
    if (!accessForm.name.trim()) {
      setError(t('errorEnterName'));
      return;
    }

    try {
      console.log('Sending access request...');
      setSubmitting(true);
      setError(null);

      const resp = await apiService.requestPublicAccess(sessionId, accessForm);
      console.log('Request response:', resp);

      if (resp.success && resp.data) {
        const newStatus = {
          status: 'pending' as const,
          message: t('join.notificationMessage'),
          participantId: resp.data.participantId,
          tempToken: (resp.data as any).tempToken
        };
        
        console.log('Status created:', newStatus);
        setRequestStatus(newStatus);
        setShowAccessModal(false);
        
        // Save to localStorage
        localStorage.setItem(`publicAccess_${sessionId}`, JSON.stringify(newStatus));
        console.log('Status saved to localStorage');
        
        toast.success(t('permissionRequested'));
      } else {
        console.log('Request error:', resp.error);
        setError(resp.error?.message || 'errorEnterName');
      }
    } catch (err) {
      console.error('Error requesting access:', err);
      setError('errorEnterName');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h1 className="text-xl font-semibold text-red-800 mb-2">{t('error')}</h1>
          <p className="text-red-600 mb-4">{t(error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Pending request status
  if (requestStatus?.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-blue-800 mb-2">{t('permissionRequested')}</h1>
          <p className="text-blue-600 mb-4">{requestStatus.message}</p>
          <p className="text-sm text-gray-500 mb-4">
            {t('join.notificationMessage')}
          </p>
          <p className="text-sm text-gray-500">
            {t('join.checkingStatus')}
          </p>
        </div>
      </div>
    );
  }

  // Checking status
  if (requestStatus?.status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-blue-800 mb-2">{t('join.checkingStatus')}</h1>
        </div>
      </div>
    );
  }

  // Rejected status
  if (requestStatus?.status === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-red-800 mb-2">{t('permissionRejected')}</h1>
          <p className="text-red-600 mb-4">{requestStatus.message}</p>
          <button
            onClick={() => {
              setRequestStatus(null);
              localStorage.removeItem(`publicAccess_${sessionId}`);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            {t('join.backToRequest')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Title */}
      <h1 className="text-4xl font-extrabold text-gray-800">{t('joinSessionTitle')}</h1>
      <p className="text-lg text-gray-600 mt-2 text-center">
        {t('joinSessionDescription')} <br />
        <strong>{sessionData?.name || t('join.sessionPlanningPoker')}</strong>
      </p>

      {/* Access options */}
      <div className="mt-8 max-w-md w-full">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mx-auto mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
            {t('join.howToParticipate')}
          </h3>
          <p className="text-sm text-gray-600 mb-4 text-center">
            {t('join.twoOptions')}
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                <strong>{t('join.loginOption')}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                <strong>{t('join.permissionOption')}</strong>
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleLogin}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            {t('login')}
          </button>
          <button
            onClick={() => setShowAccessModal(true)}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            {t('askPermission')}
          </button>
        </div>
      </div>

      {/* Permission request modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('askPermission')}
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleAccessRequest(); }}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('yourName')} *
                </label>
                <input
                  type="text"
                  id="name"
                  value={accessForm.name}
                  onChange={(e) => setAccessForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('namePlaceholder')}
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {submitting ? t('requestingPermission') : t('requestPermission')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
