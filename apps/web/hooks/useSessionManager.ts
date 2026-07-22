import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUploadStore } from '@/store/uploadStore';
import { useTranslation } from '@/lib/i18n';

export function useSessionManager() {
  const router = useRouter();
  const { sessionId, setSessionId, addFiles, clearFiles, resetSession } = useUploadStore();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isDeletingAllSessions, setIsDeletingAllSessions] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleSwitchSession = useCallback((selected: any) => {
    clearFiles();
    setSessionId(selected.id);
    addFiles(selected.files);
    router.push('/graph');
  }, [clearFiles, setSessionId, addFiles, router]);

  const handleDeleteSession = useCallback(async (targetSessionId: string) => {
    if (!confirm(t('session.confirm_delete_single'))) return;
    setDeletingSessionId(targetSessionId);
    try {
      if ((await fetch(`/api/session/${targetSessionId}`, { method: 'DELETE' })).ok) {
        if (sessionId === targetSessionId) resetSession();
        await fetchSessions();
      } else throw new Error();
    } catch {
      alert('Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  }, [sessionId, resetSession, fetchSessions, t]);

  const handleDeleteAllSessions = useCallback(async () => {
    if (!confirm(t('session.confirm_delete_all'))) return;
    setIsDeletingAllSessions(true);
    try {
      if ((await fetch('/api/session', { method: 'DELETE' })).ok) {
        resetSession();
        await fetchSessions();
      } else throw new Error();
    } catch {
      alert('Failed to delete all sessions');
    } finally {
      setIsDeletingAllSessions(false);
    }
  }, [resetSession, fetchSessions, t]);

  const handleStartNewSession = useCallback(() => {
    resetSession();
    router.push('/');
  }, [resetSession, router]);

  return {
    sessionId,
    sessions,
    isLoadingSessions,
    deletingSessionId,
    isDeletingAllSessions,
    handleSwitchSession,
    handleDeleteSession,
    handleDeleteAllSessions,
    handleStartNewSession,
  };
}

