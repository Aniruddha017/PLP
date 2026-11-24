import { useState } from 'react';
import Logo from '../Logo';
import { useAuth } from '../auth/AuthContext';
import {
  Plus,
  House,
  Books,
  CheckCircle,
  ChartLineUp,
  ChatCircleDots,
  DotsThree,
  SignOut,
  X,
  FileText,
  Gear,
  CalendarBlank,
} from '../icons';

export const Sidebar = ({
  activeChatId,
  conversations = [],
  onSelectChat,
  onNewChat,
  activeNav = 'home',
  onNavChange,
  onSignOut,
  onCloseMobile,
  onOpenProfile,
}) => {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const displayName = userProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Learner';
  const displayEmail = user?.email || '';
  const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const navItems = [
    { id: 'home', label: 'Home', icon: House, href: '/' },
    { id: 'timetable', label: 'Timetable', icon: CalendarBlank, href: '#timetable' },
    { id: 'doc-learning', label: 'Doc Learning', icon: FileText, href: '#doc-learning' },
    { id: 'subjects', label: 'Subjects', icon: Books, href: '#subjects' },
    { id: 'practice', label: 'Practice', icon: CheckCircle, href: '#practice' },
    { id: 'progress', label: 'Progress', icon: ChartLineUp, href: '#progress' },
  ];

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.subject || '').toLowerCase().includes(q) ||
      (c.topic || '').toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-zinc-200/80 bg-[#FAFAFA] p-4 text-left select-none h-full overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group cursor-pointer" aria-label="AI Tutor — Home">
            <Logo dark className="h-8 w-8 !rounded-lg transition-transform group-hover:scale-105" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-[14px] font-bold tracking-tight text-zinc-900">
                AI Tutor
              </span>
              <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Intelligent Learning
              </span>
            </div>
          </a>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} weight="bold" />
            </button>
          )}
        </div>

        {/* + New Chat Button */}
        <button
          type="button"
          onClick={() => {
            if (onNewChat) onNewChat();
            if (onCloseMobile) onCloseMobile();
          }}
          className="mt-6 flex w-full items-center justify-start gap-2.5 rounded-xl bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          <span>New Chat</span>
        </button>

        {/* Primary Navigation */}
        <nav className="mt-3 space-y-0.5 text-[12.5px] font-medium text-zinc-600">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onNavChange) onNavChange(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-zinc-200/70 font-semibold text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
                }`}
              >
                <Icon size={17} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-zinc-900' : 'text-zinc-500'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Recent Conversations */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-1 text-[11px] font-medium text-zinc-400">
            <span>Recent Conversations</span>
            {conversations.length > 0 && (
              <span className="text-[10px]">{filteredConversations.length}</span>
            )}
          </div>

          {/* Quick Filter Search */}
          {conversations.length > 3 && (
            <div className="mt-2 px-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full px-2.5 py-1 text-[11px] bg-white border border-zinc-200/80 rounded-lg placeholder-zinc-400 text-zinc-800 outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          )}

          <div className="mt-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="px-3 py-4 rounded-xl border border-dashed border-zinc-200/90 text-center bg-white/50">
                <p className="text-[11px] text-zinc-400">No conversations yet</p>
                <button
                  type="button"
                  onClick={() => {
                    if (onNewChat) onNewChat();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="mt-1.5 text-[11px] font-semibold text-zinc-800 hover:text-black hover:underline cursor-pointer"
                >
                  + Start First Chat
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="text-[11px] text-zinc-400 text-center py-3">No matching topics</p>
            ) : (
              filteredConversations.map((chat) => {
                const isActive = chat.id === activeChatId;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => {
                      onSelectChat(chat.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-zinc-200/80 font-semibold text-zinc-900 shadow-2xs'
                        : 'font-normal text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-1">
                      <ChatCircleDots
                        size={16}
                        weight={isActive ? 'bold' : 'regular'}
                        className={isActive ? 'text-zinc-900 shrink-0' : 'text-zinc-400 shrink-0'}
                      />
                      <span className="truncate">{chat.title}</span>
                    </div>
                    {isActive && (
                      <span className="text-zinc-600 shrink-0 opacity-80 hover:opacity-100">
                        <DotsThree size={16} weight="bold" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Area: User Profile Info & Sign Out */}
      <div className="mt-6 space-y-3 pt-2">
        {/* User Profile Info */}
        {user && (
          <button
            type="button"
            onClick={onOpenProfile}
            title="Manage Profile & Learning Preferences"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-zinc-200/80 shadow-2xs w-full text-left hover:border-zinc-300 hover:bg-zinc-50 transition-colors group cursor-pointer"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-zinc-900 truncate">{displayName}</div>
              <div className="text-[10px] text-zinc-400 truncate">{displayEmail}</div>
            </div>
            <Gear size={14} className="text-zinc-400 group-hover:text-zinc-800 transition-colors shrink-0" />
          </button>
        )}

        {/* User Sign Out button */}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/40 transition-colors cursor-pointer"
          >
            <span className="font-medium">Sign Out</span>
            <SignOut size={14} weight="bold" />
          </button>
        )}
      </div>
    </aside>
  );
};

export const ConsoleSidebar = Sidebar;
export default Sidebar;
