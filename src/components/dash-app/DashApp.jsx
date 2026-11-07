import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatView } from './ChatView';
import { InputBar } from './InputBar';
import { StudyPlanModal } from './StudyPlanModal';
import { conversationService } from '../../services/conversationService';
import { chatbotService } from '../../services/chatbotService';

export const DashApp = ({ onSignOut }) => {
  const { user, signOut } = useAuth();
  const handleSignOut = onSignOut || signOut;

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeNav, setActiveNav] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studyPlanOpen, setStudyPlanOpen] = useState(false);

  // Per-conversation message storage: { [chatId]: [ { id, role, content, created_at, cards, key_insight, feedback } ] }
  const [messagesByChat, setMessagesByChat] = useState({});
  const [isThinking, setIsThinking] = useState(false);

  const userId = user?.id;

  // 1. Fetch user's conversations from Supabase
  useEffect(() => {
    if (!userId) return;

    let isCancelled = false;

    const fetchConvs = async () => {
      try {
        const data = await conversationService.getUserConversations(userId);
        if (isCancelled) return;

        if (data && data.length > 0) {
          setConversations(data);
          setActiveChatId((prev) => (data.some((c) => c.id === prev) ? prev : data[0].id));
        } else {
          setConversations([]);
          setActiveChatId(null);
        }
      } catch (err) {
        console.warn('Failed to load conversations from database:', err);
      }
    };

    fetchConvs();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  // 2. Load message history when selecting a conversation
  useEffect(() => {
    if (!activeChatId || !userId) return;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeChatId);
    if (!isUuid) return;

    let isCancelled = false;

    const fetchHistory = async () => {
      try {
        const msgs = await conversationService.getMessages(activeChatId);
        if (isCancelled) return;

        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: msgs || [],
        }));
      } catch (err) {
        console.warn('Failed to fetch messages for thread:', err);
      }
    };

    fetchHistory();

    return () => {
      isCancelled = true;
    };
  }, [activeChatId, userId]);

  // Current active conversation and messages
  const currentChat = conversations.find((c) => c.id === activeChatId) || null;
  const currentMessages = activeChatId ? messagesByChat[activeChatId] || [] : [];

  const handleSendMessage = async (text) => {
    if (!text || !text.trim()) return;

    let chatId = activeChatId;

    // If no active conversation exists yet, automatically create one in Supabase
    if (!chatId && userId) {
      try {
        const derivedTitle = text.length > 35 ? text.slice(0, 32).trim() + '...' : text.trim();
        const newConv = await conversationService.createConversation(userId, {
          title: derivedTitle || 'New Conversation',
          subject: 'General Study',
          topic: derivedTitle || 'General Inquiry',
        });
        if (newConv) {
          chatId = newConv.id;
          setConversations((prev) => [newConv, ...prev]);
          setActiveChatId(chatId);
        }
      } catch (err) {
        console.error('Failed to create new conversation:', err);
      }
    }

    const timeStr = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const userMsg = {
      id: tempId,
      role: 'user',
      content: text,
      created_at: timeStr,
    };

    // Optimistically update UI
    if (chatId) {
      setMessagesByChat((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), userMsg],
      }));
    }

    setIsThinking(true);

    const isUuid = chatId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatId);

    // Persist user message to Supabase
    if (userId && isUuid) {
      await conversationService.saveMessage({
        conversationId: chatId,
        senderId: userId,
        role: 'user',
        content: text,
      });
    }

    // 1. Send request to the Python FastAPI microservice
    try {
      const apiResponse = await chatbotService.sendMessage({
        conversationId: isUuid ? chatId : null,
        message: text,
      });

      if (apiResponse?.message) {
        const tutorMsg = {
          id: `resp-${Date.now()}`,
          role: 'assistant',
          content: apiResponse.message,
          cards: apiResponse.cards || [],
          key_insight: apiResponse.key_insight || null,
          created_at: new Date().toISOString(),
        };

        if (chatId) {
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), tutorMsg],
          }));
        }
        setIsThinking(false);
        return;
      }
    } catch (microserviceErr) {
      console.warn('Microservice unavailable or offline:', microserviceErr.message);
    }

    // 2. Intelligent Socratic Fallback if microservice server is offline
    const fallbackText =
      "I'm your AI Tutor. To generate live curriculum-aligned insights, please start the Python AI microservice (`uvicorn app.main:app --port 8000`). In the meantime, I'm ready to discuss any academic topic, formula, or concept you'd like to explore!";
    const tutorMsg = {
      id: `resp-${Date.now()}`,
      role: 'assistant',
      content: fallbackText,
      created_at: new Date().toISOString(),
    };

    if (chatId) {
      setMessagesByChat((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), tutorMsg],
      }));
    }
    setIsThinking(false);
  };

  const handleNewChat = async () => {
    if (!userId) return;

    try {
      const newTitle = `Topic Study #${conversations.length + 1}`;
      const newConv = await conversationService.createConversation(userId, {
        title: newTitle,
        subject: 'General Study',
        topic: 'Concept Inquiry',
      });

      if (newConv) {
        setConversations((prev) => [newConv, ...prev]);
        setActiveChatId(newConv.id);
        setMessagesByChat((prev) => ({
          ...prev,
          [newConv.id]: [],
        }));
      }
    } catch (err) {
      console.warn('Could not create new chat in database:', err);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentChat?.id) return;
    const newStatus = !currentChat.is_bookmarked;
    setConversations((prev) =>
      prev.map((c) => (c.id === currentChat.id ? { ...c, is_bookmarked: newStatus } : c))
    );

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentChat.id);
    if (userId && isUuid) {
      await conversationService.toggleBookmark(currentChat.id, currentChat.is_bookmarked);
    }
  };

  return (
    <div className="h-screen w-screen bg-white text-zinc-800 flex overflow-hidden font-sans select-none relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          activeChatId={activeChatId}
          conversations={conversations}
          onSelectChat={setActiveChatId}
          onNewChat={handleNewChat}
          activeNav={activeNav}
          onNavChange={setActiveNav}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-72 max-w-[80vw] bg-[#FAFAFA] h-full shadow-2xl z-10 flex flex-col">
            <Sidebar
              activeChatId={activeChatId}
              conversations={conversations}
              onSelectChat={setActiveChatId}
              onNewChat={handleNewChat}
              activeNav={activeNav}
              onNavChange={setActiveNav}
              onSignOut={handleSignOut}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden min-w-0">
        {/* Header */}
        <Header
          subject={currentChat?.subject || 'AI Tutor'}
          topic={currentChat?.topic || currentChat?.title || 'Interactive Session'}
          isBookmarked={currentChat?.is_bookmarked ?? false}
          onToggleBookmark={handleToggleBookmark}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenStudyPlan={() => setStudyPlanOpen(true)}
        />

        {/* Interactive Chat / Workbench Area */}
        <ChatView
          conversation={currentChat}
          messages={currentMessages}
          isThinking={isThinking}
        />

        {/* Bottom Follow-Up Question Bar */}
        <InputBar
          onSendMessage={handleSendMessage}
          disabled={isThinking}
        />
      </div>

      {/* Adaptive Study Plan Modal */}
      <StudyPlanModal
        isOpen={studyPlanOpen}
        onClose={() => setStudyPlanOpen(false)}
        currentTopic={currentChat?.topic || 'Curriculum Overview'}
      />
    </div>
  );
};

export const LearningConsoleApp = DashApp;
export default DashApp;
