import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUploadStore } from '@/store/uploadStore';

export function useSessionManager() {
  const router = useRouter();
  const { sessionId, setSessionId, addFiles, clearFiles, resetSession } = useUploadStore();

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      if (!res.ok) throw new Error('Failed to fetch saved sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSwitchSession = useCallback((selected: any) => {
    clearFiles();
    setSessionId(selected.id);
    addFiles(selected.files);
    router.push('/graph');
  }, [clearFiles, setSessionId, addFiles, router]);

  const handleDeleteSession = useCallback(async (targetSessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This will permanently delete all parsed files, entities, and email threads for this session.')) return;
    
    try {
      const res = await fetch(`/api/session/${targetSessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete session');
      
      if (sessionId === targetSessionId) {
        resetSession();
      }
      
      fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }, [sessionId, resetSession, fetchSessions]);

  const handleDeleteAllSessions = useCallback(async () => {
    if (!confirm('Are you sure you want to permanently delete ALL sessions? This will wipe all uploaded files, emails, parsed entities, and co-occurrence graphs across the entire database. This action is irreversible.')) return;
    
    try {
      const res = await fetch('/api/session', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete all sessions');
      
      resetSession();
      fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete all sessions');
    }
  }, [resetSession, fetchSessions]);

  const handleStartNewSession = useCallback(() => {
    resetSession();
    router.push('/');
  }, [resetSession, router]);

  return {
    sessionId,
    sessions,
    isLoadingSessions,
    handleSwitchSession,
    handleDeleteSession,
    handleDeleteAllSessions,
    handleStartNewSession,
  };
}
