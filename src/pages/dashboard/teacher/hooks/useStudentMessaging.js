import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '../../../../lib/supabaseClient';
import { getFullName } from '../../../../utils/nameUtils';

const useStudentMessaging = ({ selectedSubject, selectedStudent }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({ subject: '', message: '', priority: 'normal' });

  const openMessageModal = useCallback(() => setShowMessageModal(true), []);
  const closeMessageModal = useCallback(() => {
    setShowMessageModal(false);
    setMessageForm({ subject: '', message: '', priority: 'normal' });
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const { error } = await supabase.from('notifications').insert([messageData]);
      if (error) throw error;
      return messageData;
    },
    onSuccess: () => {
      alert('Message sent successfully!');
      closeMessageModal();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    },
  });

  const sending = sendMessageMutation.isPending;

  const sendMessage = useCallback(() => {
    if (!selectedStudent || !user?.id) return;
    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      alert('Please fill in both subject and message fields.');
      return;
    }

    const messageData = {
      sender_id: user.id,
      recipient_id: selectedStudent.id,
      title: messageForm.subject.trim(),
      message: messageForm.message.trim(),
      priority: messageForm.priority,
      type: 'teacher_to_student',
      status: 'unread',
      metadata: {
        fromName: user.full_name || 'Teacher',
        fromEmail: user.email,
        toName: getFullName(selectedStudent),
        toEmail: selectedStudent.email,
        subject: selectedSubject,
      },
      created_at: new Date().toISOString(),
    };

    sendMessageMutation.mutate(messageData);
  }, [messageForm, selectedStudent, selectedSubject, sendMessageMutation, user]);

  return {
    showMessageModal,
    openMessageModal,
    closeMessageModal,
    messageForm,
    setMessageForm,
    sending,
    sendMessage,
  };
};

export default useStudentMessaging;
