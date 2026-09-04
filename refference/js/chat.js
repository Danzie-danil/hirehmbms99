
(function () {
    'use strict';

    let _activeBranchId = null;
    let _counterpartAvatarUrl = null;
    let _isGroupChat = false;
    let _replyingTo = null;
    let _activeMessages = [];
    let _activePins = [];
    let _longPressTimer = null;
    let _activeContextMenu = null;
    let _isSearchOpen = false;
    let _activeGroup = null;
    let _typingTimeout = null;
    let _typingState = {};
    let _typingListTimers = {};
    let _myTypingTimer = null;

    let _mediaRecorder = null;
    let _audioChunks = [];
    let _recordingStartTime = null;
    let _recordingTimerInterval = null;
    let _recordedBlob = null;

    window.renderChatModule = async function () {
        const container = document.getElementById('mainContent');
        _isGroupChat = false;
        _activeBranchId = state.role === 'branch' ? null : null;

        renderUnifiedChat(container);
    };

    async function renderUnifiedChat(container) {
        const isOwner = state.role === 'owner';

        container.innerHTML = `
            <div id="chatMainContainer" class="flex flex-col h-[calc(100vh-140px)] bg-[var(--chat-bg)] rounded-[1.5rem] shadow-2xl border border-gray-200/20 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-500">
                <div class="flex h-full">
                    <!-- Sidebar -->
                    <div id="chatSidebar" class="w-full md:w-72 border-r border-gray-200 dark:border-white/10 flex flex-col bg-[var(--chat-sidebar)]">
                        <div class="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <h3 class="text-base font-black text-[var(--text-primary)]">Chats</h3>
                            <div class="flex gap-2">
                                ${isOwner ? `<button onclick="window.handleNewChat()" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-500 transition-all active:scale-95" title="New Chat"><i data-lucide="message-square-plus" class="w-5 h-5"></i></button>` : ''}
                                <button onclick="window.toggleSidebarMenu(event)" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-500 transition-all active:scale-95" title="Menu"><i data-lucide="more-vertical" class="w-5 h-5"></i></button>
                            </div>
                        </div>
                        <!-- Search Bar in Sidebar -->
                        <div class="px-4 py-2 border-b border-gray-100 dark:border-white/5">
                            <div class="bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 flex items-center gap-3 border border-transparent focus-within:border-emerald-500/30 transition-all">
                                <i data-lucide="search" class="w-3.5 h-3.5 opacity-40"></i>
                                <input type="text" placeholder="Search or start new chat" id="sidebarSearchInput" oninput="window.handleSidebarSearch(this.value)"
                                       class="bg-transparent border-none focus:ring-0 text-sm outline-none text-[var(--text-primary)] flex-1 placeholder:text-[11px] placeholder:font-bold placeholder:uppercase placeholder:tracking-wider placeholder:opacity-40"
                                       style="background-color: transparent !important;">
                            </div>
                        </div>
                        <div class="p-3 space-y-2">
                             <button onclick="window.selectGroupChat()"
                                    id="groupChatBtn"
                                    class="w-full flex items-center gap-2.5 p-2 px-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] border border-transparent ${_isGroupChat && !_activeGroupId ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'} group relative">
                                <div class="w-8 h-8 rounded-full ${_isGroupChat && !_activeGroupId ? 'bg-white/20' : 'bg-emerald-500'} flex items-center justify-center shadow-sm flex-shrink-0">
                                    <i data-lucide="globe" class="w-4 h-4 text-white"></i>
                                </div>
                                <div class="text-left flex-1 min-w-0">
                                    <div class="flex justify-between items-center">
                                        <p class="text-[13px] font-black leading-tight ${_isGroupChat && !_activeGroupId ? 'text-white' : 'text-gray-800 dark:text-gray-200'}">Global Room</p>
                                        <div id="globalUnreadBadge" class="hidden bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 items-center justify-center rounded-full shadow-sm flex-shrink-0"></div>
                                    </div>
                                    <p class="text-[9px] font-medium truncate ${_isGroupChat && !_activeGroupId ? 'text-white/70' : 'text-gray-400'}">Shared announcement space</p>
                                </div>
                            </button>
                            <div id="groupChatList" class="space-y-1"></div>
                        </div>
                        <div id="branchChatList" class="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
                            <div class="p-8 text-center text-gray-400 text-xs italic">Loading...</div>
                        </div>
                    </div>
                    <!-- Chat Window -->
                    <div id="chatWindow" class="flex-1 flex flex-col bg-[var(--chat-bg)] relative overflow-hidden">
                        <div class="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                            <div class="w-24 h-24 bg-white/5 dark:bg-black/20 backdrop-blur rounded-full flex items-center justify-center mb-6 shadow-sm border border-white/10">
                                <i data-lucide="send" class="w-10 h-10 text-emerald-500 opacity-40"></i>
                            </div>
                            <h4 class="text-xl font-bold text-gray-500">Chat Space</h4>
                            <p class="text-sm font-medium max-w-xs mt-3 opacity-60">Send and receive messages across branches in real-time.</p>
                            <div class="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                                <i data-lucide="lock" class="w-3 h-3"></i> End-to-end Encrypted
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Shared Dropdown -->
            <div id="globalDropdown" class="fixed hidden z-[100] bg-white dark:bg-[#1f2c33] rounded-2xl shadow-2xl py-2 w-56 border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-150"></div>
        `;
        lucide.createIcons();
        updateBranchList();
        updateGroupList();
    }

    window.updateGroupList = async function () {
        const list = document.getElementById('groupChatList');
        if (!list) return;
        updateGlobalBadge();
        try {
            const groups = await dbMessages.fetchGroups(state.role === 'branch' ? state.branchId : null);
            const groupData = await Promise.all(groups.map(async g => {
                const unread = await dbMessages.getUnreadCount(null, state.role, g.id, false, 'messages');
                return { ...g, unread };
            }));

            if (groupData.length === 0) {
                list.innerHTML = '';
                return;
            }

            list.innerHTML = groupData.map(g => {
                const isActive = _activeGroupId === g.id;
                return `
                    <button onclick="window.selectGroupChat('${g.id}')"
                            class="w-full text-left p-2 px-3 transition-all flex items-center gap-2.5 group rounded-xl ${isActive ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 border-transparent'} border">
                        <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-[10px] ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'} transition-colors uppercase">
                            ${g.name.charAt(0)}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-center mb-0.5">
                                <p class="text-[13px] font-bold truncate ${isActive ? 'text-[var(--text-primary)]' : 'text-gray-800 dark:text-gray-200'}">${g.name}</p>
                                ${g.unread > 0 ? `<span class="bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full shadow-sm flex-shrink-0">${g.unread}</span>` : ''}
                            </div>
                            <p class="text-[9px] opacity-40 truncate">Group Room</p>
                        </div>
                    </button>
                `;
            }).join('');
            lucide.createIcons();
        } catch (e) {
            console.error('Failed to update group list:', e);
        }
    }

    async function updateGlobalBadge() {
        const badge = document.getElementById('globalUnreadBadge');
        if (!badge) return;
        try {
            const unread = await dbMessages.getUnreadCount(null, state.role, null, true, 'messages');
            if (unread > 0) {
                badge.textContent = unread > 99 ? '99+' : unread;
                badge.classList.remove('hidden');
                badge.classList.add('flex');
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }
        } catch (e) { }
    }

    window.updateBranchList = async function () {
        const list = document.getElementById('branchChatList');
        if (!list) return;

        const isOwner = state.role === 'owner';
        const onlineMap = {};
        if (window.onlineUsers) {
            Object.keys(window.onlineUsers).forEach(k => onlineMap[k.toLowerCase()] = window.onlineUsers[k]);
        }

        if (isOwner) {
            const branches = state.branches;
            const branchData = await Promise.all(branches.map(async b => {
                const [unread, lastMsg] = await Promise.all([
                    dbMessages.getUnreadCount(b.id, 'owner', null, false, 'messages'),
                    dbMessages.fetchLast(b.id, false)
                ]);
                return { ...b, unread, lastMsg };
            }));

            list.innerHTML = branchData.map(b => {
                const bIdNormal = String(b.id).toLowerCase();
                const isActive = _activeBranchId === b.id && !_isGroupChat;
                const isOnline = !!onlineMap[bIdNormal];
                const isTyping = !!_typingState[bIdNormal];
                const timeStr = b.lastMsg ? new Date(b.lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const snippet = b.lastMsg ? (b.lastMsg.content || (b.lastMsg.metadata?.attachment ? '📎 Attachment' : '')) : (b.location || 'Branch');

                const avatarInner = b.avatar_url
                    ? `<img src="${b.avatar_url}" alt="${b.name}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                       <span class="w-8 h-8 rounded-full hidden items-center justify-center font-black text-[10px] ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'} uppercase">${b.name.charAt(0)}</span>`
                    : `<span class="w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'} uppercase">${b.name.charAt(0)}</span>`;

                const snippetHtml = isTyping
                    ? `<span class="flex items-center gap-1 text-emerald-500">
                            <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                            <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                            <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                            <span class="text-[9px] font-bold ml-0.5">typing...</span>
                       </span>`
                    : `<span class="text-[9px] text-gray-500 dark:text-gray-400 truncate opacity-80 font-medium">${snippet}</span>`;

                return `
                    <button onclick="window.selectChatBranch('${b.id}')"
                            data-typing-key="${bIdNormal}"
                            data-snippet="${snippet.replace(/"/g, '&quot;')}"
                            class="w-full text-left p-2 px-3 transition-all flex items-center gap-2.5 group rounded-xl ${isActive ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 border-transparent'} border">
                        <div class="relative flex-shrink-0">
                            ${avatarInner}
                            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--chat-sidebar)] ${isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/10'}"></span>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex justify-between items-center mb-0.5">
                                <p class="text-[13px] font-bold truncate text-[var(--text-primary)]">${b.name}</p>
                                <span class="text-[9px] ${isOnline ? 'text-emerald-500' : 'text-gray-400'} font-black uppercase tracking-tight">${isOnline ? 'online' : (timeStr || '')}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <div class="typing-snippet min-w-0 flex-1 mr-1">${snippetHtml}</div>
                                ${b.unread > 0 ? `<span class="bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full shadow-sm flex-shrink-0">${b.unread}</span>` : ''}
                            </div>
                        </div>
                    </button>
                `;
            }).join('');
        } else {

            const [unread, lastMsg] = await Promise.all([
                dbMessages.getUnreadCount(state.branchId, 'branch', null, false, 'messages'),
                dbMessages.fetchLast(state.branchId, false)
            ]);
            const isActive = _activeBranchId === state.branchId && !_isGroupChat;
            const enterpriseName = state.enterpriseName || 'Administrator';
            const timeStr = lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const snippet = (lastMsg ? (lastMsg.content || (lastMsg.metadata?.attachment ? '📎 Attachment' : '🎤 Voice note')) : 'Enterprise Support') || '';

            const ownerIdNormal = String(state.ownerId || (state.branches && state.branches[0]?.owner_id)).toLowerCase();
            const isOnline = !!onlineMap[ownerIdNormal];

            const ownerAvatarUrl = state.profile?.avatar_url;
            const ownerAvatarInner = ownerAvatarUrl
                ? `<img src="${ownerAvatarUrl}" alt="Admin" class="w-8 h-8 rounded-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                   <span class="w-8 h-8 rounded-full hidden items-center justify-center font-black text-[10px] ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'} uppercase">A</span>`
                : `<span class="w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'} uppercase">A</span>`;

            const isTyping = !!_typingState[ownerIdNormal];
            const snippetHtml = isTyping
                ? `<span class="flex items-center gap-1 text-emerald-500">
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                        <span class="text-[9px] font-bold ml-0.5">typing...</span>
                   </span>`
                : `<span class="text-[9px] text-gray-500 dark:text-gray-400 truncate opacity-80 font-medium">${snippet}</span>`;

            list.innerHTML = `
                <button onclick="window.selectChatBranch('${state.branchId}')"
                        data-typing-key="${ownerIdNormal}"
                        data-snippet="${snippet.replace(/"/g, '&quot;')}"
                        class="w-full text-left p-2 px-3 transition-all flex items-center gap-2.5 group rounded-xl ${isActive ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 border-transparent'} border">
                    <div class="relative flex-shrink-0">
                        ${ownerAvatarInner}
                        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--chat-sidebar)] ${isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/10'}"></span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex justify-between items-center mb-0.5">
                            <p class="text-[13px] font-bold truncate text-[var(--text-primary)]">${enterpriseName}</p>
                            <span class="text-[9px] ${isOnline ? 'text-emerald-500' : 'text-gray-400'} font-black uppercase tracking-tight">${isOnline ? 'online' : (timeStr || '')}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <div class="typing-snippet min-w-0 flex-1 mr-1">${snippetHtml}</div>
                            ${unread > 0 ? `<span class="bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full shadow-sm flex-shrink-0">${unread}</span>` : ''}
                        </div>
                    </div>
                </button>
            `;
        }
    }

    let _activeGroupId = null;

    window.selectGroupChat = async function (groupId = null) {
        _isGroupChat = true;
        _activeBranchId = null;
        _activeGroupId = groupId;

        if (groupId) {
            try {
                const groups = await dbMessages.fetchGroups();
                _activeGroup = groups.find(g => g.id === groupId);
            } catch (e) {
                console.error('Failed to fetch group details:', e);
            }
        } else {
            _activeGroup = { name: 'Global Room', is_global: true };
        }

        updateBranchList();
        renderConversation(null, true, groupId);
    };

    window.selectChatBranch = function (branchId) {
        _isGroupChat = false;
        _activeBranchId = branchId;
        _activeGroupId = null;
        updateBranchList();
        renderConversation(branchId, false);
    };

    async function renderConversation(branchId, isGroup, groupId = null) {
        const chatWindow = document.getElementById('chatWindow');

        let title = 'Chat';
        if (isGroup) {
            title = groupId ? 'Group' : 'Global Room';
        } else {
            if (state.role === 'owner') {
                title = state.branches.find(b => b.id === branchId)?.name || 'Branch';
            } else {

                title = state.enterpriseName || 'Administrator';
            }
        }

        _counterpartAvatarUrl = null;
        if (!isGroup) {
            _counterpartAvatarUrl = state.role === 'owner'
                ? (state.branches.find(b => b.id === branchId)?.avatar_url || null)
                : (state.profile?.avatar_url || null);
        }

        const headerAvatarHtml = isGroup
            ? `<div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm"><i data-lucide="users" class="w-5 h-5 text-white"></i></div>`
            : (_counterpartAvatarUrl
                ? `<img src="${_counterpartAvatarUrl}" alt="${title}" class="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-emerald-500/20" onerror="this.style.display='none'">`
                : `<div class="w-10 h-10 rounded-full bg-gray-400 dark:bg-white/10 flex items-center justify-center shadow-sm"><i data-lucide="building-2" class="w-5 h-5 text-white"></i></div>`);

        chatWindow.innerHTML = `
            <!-- Chat Header -->
            <div class="h-16 px-6 bg-[var(--chat-header)] flex items-center justify-between border-l border-gray-200 dark:border-white/5 relative z-20">
                <div class="flex items-center gap-4">
                    <button onclick="window.toggleMobileChatView('list')" class="md:hidden p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-gray-500 transition-all active:scale-90">
                        <i data-lucide="chevron-left" class="w-6 h-6"></i>
                    </button>
                    ${headerAvatarHtml}
                    <div>
                        <h4 class="text-[15px] font-bold text-[var(--text-primary)] leading-none">${title}</h4>
                        <div id="chatPresenceIndicator" class="flex items-center gap-1.5 mt-1">
                            <!-- Populated by updateChatPresenceUI -->
                        </div>
                    </div>
                </div>
                <div class="flex gap-4 text-gray-500 dark:text-gray-400">
                    <button onclick="window.toggleSearch()" class="hover:text-emerald-500 transition-all active:scale-95"><i data-lucide="search" class="w-5 h-5"></i></button>
                    <button onclick="window.toggleHeaderMenu(event)" class="hover:text-emerald-500 transition-all active:scale-95"><i data-lucide="more-vertical" class="w-5 h-5"></i></button>
                </div>
            </div>

            <!-- Search Bar (Sub-header) -->
            <div id="searchBar" class="hidden h-14 px-6 bg-[var(--chat-input-bar)] border-b border-gray-200 dark:border-white/5 flex items-center animate-in slide-in-from-top-2">
                <div class="flex-1 flex items-center gap-3 bg-white dark:bg-[#1f2c33] px-4 py-2 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <i data-lucide="search" class="w-4 h-4 opacity-40"></i>
                    <input type="text" id="msgSearchInput" placeholder="Search in conversation"
                           class="flex-1 bg-transparent border-none focus:ring-0 text-[14px] outline-none text-[var(--text-primary)]"
                           oninput="window.handleMsgSearch(this.value)">
                    <button onclick="window.toggleSearch()" class="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- Pinned Area -->
            <div id="pinsArea" class="hidden px-6 py-2 bg-[var(--chat-header)] backdrop-blur border-b border-gray-200 dark:border-white/5 flex flex-col gap-2 z-10"></div>

            <!-- Message List -->
            <div id="messageHistory" class="flex-1 overflow-y-auto p-4 md:p-8 space-y-1 bg-[var(--chat-bg)] relative scroller-custom"
                 style="background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-blend-mode: overlay; background-size: 400px; background-attachment: fixed; opacity: 1;">
                <div class="flex flex-col items-center justify-center h-full space-y-4">
                     <div class="loading-spinner border-emerald-500 border-t-transparent shadow-sm"></div>
                </div>
            </div>

            <!-- Reply Preview -->
            <div id="replyPreview" class="hidden px-8 py-3 bg-[var(--chat-input-bar)] border-t border-gray-200 dark:border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div class="flex items-center gap-4 border-l-4 border-emerald-500 pl-4 py-1.5 bg-black/5 dark:bg-white/5 rounded-r-xl pr-6">
                    <div class="min-w-0">
                        <p id="replyToName" class="text-[11px] font-black text-emerald-500 uppercase tracking-wider"></p>
                        <p id="replyToContent" class="text-sm text-gray-500 dark:text-gray-400 truncate italic max-w-lg"></p>
                    </div>
                </div>
                <button onclick="window.cancelReply()" class="w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-gray-400">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Input Bar -->
            <div class="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4 bg-[var(--chat-input-bar)] flex items-end gap-2 md:gap-3 px-3 md:px-6 relative z-30 border-t border-gray-200 dark:border-white/5 transition-all">
                <div class="flex gap-4 pb-2 text-gray-500 dark:text-gray-400 relative">
                    <button onclick="window.toggleEmojiPicker(event)" class="hover:text-emerald-500 transition-all active:scale-90"><i data-lucide="smile" class="w-6 h-6"></i></button>
                    <div class="relative">
                        <button onclick="window.toggleAttachmentMenu(event)" class="hover:text-emerald-500 transition-all active:scale-90" title="Add Attachment">
                            <i data-lucide="plus" class="w-6 h-6"></i>
                        </button>

                        <!-- Hidden File Input for All Attachments -->
                        <input type="file" id="chatFileInput" class="hidden" onchange="window.handleAttachment(this)">

                        <!-- Attachment Menu Popover (Image 2 Style) -->
                        <div id="attachmentMenu" class="absolute bottom-full left-0 mb-6 hidden bg-white dark:bg-[#232d36] rounded-2xl shadow-2xl py-2 w-48 border border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 z-50">
                            <div class="flex flex-col">
                                <button onclick="window.triggerFileSelect('doc')" class="w-full text-left px-4 py-3 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between group transition-all">
                                    <span>Document</span>
                                    <i data-lucide="file-text" class="w-4 h-4 opacity-40 group-hover:opacity-100 transition-all"></i>
                                </button>
                                <button onclick="window.triggerFileSelect('image')" class="w-full text-left px-4 py-3 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between group transition-all">
                                    <span>Photos & Videos</span>
                                    <i data-lucide="image" class="w-4 h-4 opacity-40 group-hover:opacity-100 transition-all"></i>
                                </button>
                                <button onclick="window.triggerFileSelect('camera')" class="w-full text-left px-4 py-3 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between group transition-all">
                                    <span>Camera</span>
                                    <i data-lucide="camera" class="w-4 h-4 opacity-40 group-hover:opacity-100 transition-all"></i>
                                </button>
                                <div class="h-[1px] bg-gray-100 dark:bg-white/5 my-1 mx-2"></div>
                                <button onclick="showToast('Poll feature coming soon', 'info')" class="w-full text-left px-4 py-3 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between group transition-all">
                                    <span>Poll</span>
                                    <i data-lucide="bar-chart-2" class="w-4 h-4 opacity-40 group-hover:opacity-100 transition-all"></i>
                                </button>
            </div>
                        </div>
                    </div>

                    <!-- Emoji Picker Popover -->
                    <div id="emojiPicker" class="absolute bottom-full left-0 mb-4 hidden bg-white dark:bg-[#232d36] rounded-2xl shadow-2xl w-80 border border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 z-50 flex flex-col overflow-hidden">
                        <!-- Category Tabs -->
                        <div class="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/10">
                            ${[
                { icon: 'clock', cat: 'Recent', title: 'Recent' },
                { icon: 'smile', cat: 'Smileys', title: 'Smileys' },
                { icon: 'dog', cat: 'Animals', title: 'Animals' },
                { icon: 'coffee', cat: 'Food', title: 'Food' },
                { icon: 'plane', cat: 'Travel', title: 'Travel' },
                { icon: 'volleyball', cat: 'Activities', title: 'Activities' },
                { icon: 'lightbulb', cat: 'Objects', title: 'Objects' },
                { icon: 'hash', cat: 'Symbols', title: 'Symbols' },
                { icon: 'flag', cat: 'Flags', title: 'Flags' }
            ].map(t => `
                                <button onclick="window.scrollToEmojiCategory('${t.cat}')" title="${t.title}" class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-emerald-500">
                                    <i data-lucide="${t.icon}" class="w-4 h-4"></i>
                                </button>
                            `).join('')}
                            <div class="w-[1px] h-4 bg-gray-200 dark:bg-white/10 mx-0.5"></div>
                            <button onclick="document.getElementById('emojiPicker').classList.add('hidden')" class="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-all">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        </div>

                        <!-- Search Bar -->
                        <div class="p-2 border-b border-gray-100 dark:border-white/5">
                            <div class="relative">
                                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"></i>
                                <input type="text" placeholder="Search emoji" oninput="window.handleEmojiSearch(this.value)"
                                       class="w-full bg-gray-100 dark:bg-white/5 border-none rounded-xl pl-8 pr-4 py-1.5 text-[13px] outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all">
                            </div>
                        </div>

                        <!-- Emoji Grid -->
                        <div id="emojiGridContainer" class="max-h-64 overflow-y-auto scroller-custom p-3 pt-1">
                            ${[
                { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '🥵', '🥶', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃'] },
                { name: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦏', '🐪', '🐫', '🦒', '🦘', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐿', '🦔'] },
                { name: 'Food', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🫑', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🌮', '🌯', '🥗', '🥘', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'] },
                { name: 'Travel', emojis: ['🚗', '🚕', '🚙', '🚌', '🚐', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛵', '🚲', '🛴', '🚏', '🛣', '🛤', '⛽️', '🚨', '🚥', '🚦', '🚧', '⚓️', '⛵️', '🛶', '🚤', '🛳', '⛴', '🚢', '✈️', '🛩', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🛰', '🚀', '🛸', '🛎', '🧳', '⌛️', '⏳', '⌚️', '⏰', '⏱', '⏲', '🕰', '🌡', '☀️', '🌤', '⛅️', '🌥', '☁️', '🌦', '🌧', '⛈', '🌩', '🌨', '❄️', '☃️', '⛄️', '🌬', '💨', '🌪', '🌫', '🌈', '⛱', '⚡️', '❄️', '🔥', '💥', '☄️', '🌛', '☀️', '🌍', '🌎', '🌏', '🌑', '🌓', '🌕', '🌙', '🌚', '🪐', '💫', '⭐️', '🌟', '✨', '⚡️'] },
                { name: 'Activities', emojis: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳️', '🪁', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '⛸️', '⛷️', '🏂', '🏋️', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸', '🎻', '🎲', '🧩', '♟', '🎯', '🎳', '🎮', '🎰'] },
                { name: 'Objects', emojis: ['⌚️', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🪔', '🪟', '🗑', '🛢', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒', '🛠', '⛏', '🪓', '🔩', '⚙️', '🗜', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🪚', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪'] },
                { name: 'Symbols', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆑', '🅾️', '🅿️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🈳', '🈂️', '🛂', '🛃', '🛄'] },
                { name: 'Flags', emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇪🇹', '🇪🇺'] }
            ].map(cat => `
                                <div id="emoji-cat-${cat.name.split(' ')[0]}" class="emoji-category-section mb-4">
                                    <p class="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 sticky top-0 bg-white dark:bg-[#232d36] py-1 whitespace-nowrap z-10">${cat.name}</p>
                                    <div class="grid grid-cols-7 gap-1 emoji-grid">
                                        ${cat.emojis.map(e => `
                                            <button onclick="window.addEmoji('${e}')" title="${e}" data-emoji="${e}" class="emoji-item text-xl p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all active:scale-125 flex items-center justify-center">
                                                ${e}
                                            </button>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="flex-1 bg-white dark:bg-[#1f2c33] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-1 flex items-end relative overflow-hidden">
                     <textarea id="chatInput" placeholder="Type a message" rows="1" required
                            class="flex-1 bg-transparent border-none px-4 py-2 text-[15px] focus:ring-0 outline-none resize-none max-h-40 leading-normal text-[var(--text-primary)] transition-all rounded-2xl"
                            oninput="window.handleChatInput(this)"
                            onblur="window.handleChatInput(this, true)"
                            onkeydown="if(event.key === 'Enter' && !event.shiftKey && localStorage.getItem('chatPref_enter') !== 'false') { event.preventDefault(); window.handleChatSubmit(event); }"></textarea>

                    <!-- Recording Bar (Hidden by default) -->
                    <div id="recordingBar" class="absolute inset-0 bg-white dark:bg-[#1f2c33] hidden flex items-center justify-between px-4 animate-in slide-in-from-bottom-full duration-300 z-20">
                        <div class="flex items-center gap-3">
                            <div class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                            <span id="recordingTimer" class="text-sm font-bold text-[var(--text-primary)] tabular-nums">0:00</span>
                        </div>
                        <div class="flex items-center gap-2">
                             <button onclick="window.cancelRecording()" class="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full text-red-500 transition-all active:scale-90" title="Cancel">
                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                            </button>
                            <button onclick="window.stopRecording()" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-emerald-500 transition-all active:scale-90" title="Stop">
                                <i data-lucide="square" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Review Bar (Hidden by default) -->
                    <div id="reviewBar" class="absolute inset-0 bg-white dark:bg-[#1f2c33] hidden flex items-center justify-between px-4 animate-in fade-in duration-300 z-20">
                         <div class="flex items-center gap-3 flex-1 mr-4">
                            <i data-lucide="mic" class="w-4 h-4 text-emerald-500"></i>
                            <div class="h-1 flex-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div class="h-full bg-emerald-500 w-full"></div>
                            </div>
                        </div>
                         <div class="flex items-center gap-2">
                             <button onclick="window.discardVoiceNote()" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400" title="Discard">
                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="pb-1">
                    <button onclick="window.handleChatSubmit(event)" id="sendChatBtn"
                            class="bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg active:scale-95 flex-shrink-0">
                        <i data-lucide="mic" id="micIcon" class="w-5 h-5"></i>
                        <i data-lucide="send" id="sendIcon" class="w-5 h-5 ml-0.5 hidden"></i>
                    </button>
                </div>
            </div>

            <!-- Floating Menu / Context Menu (Hidden) -->
            <div id="contextMenu" class="fixed hidden z-[100] bg-white dark:bg-[#232d36] rounded-t-3xl md:rounded-2xl shadow-2xl p-2 w-full md:w-64 border-t md:border border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-200 bottom-0 left-0 md:bottom-auto md:left-auto">
                <div class="flex justify-between px-3 py-3 md:py-2 border-b border-gray-100 dark:border-white/5 mb-2 gap-2 overflow-x-auto scroller-hidden">
                    ${['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => `
                        <button onclick="window.applyReaction('${emoji}')" class="text-2xl md:text-xl hover:scale-125 transition-transform p-1 animate-in zoom-in-50">${emoji}</button>
                    `).join('')}
                </div>
                <div class="space-y-0.5 pb-8 md:pb-0">
                    <button onclick="window.execMenu('reply')" class="w-full text-left px-5 py-3.5 md:px-4 md:py-2.5 text-[15px] md:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl flex items-center justify-between group transition-colors">
                        Reply <i data-lucide="reply" class="w-5 h-5 md:w-4 md:h-4 opacity-50 group-hover:opacity-100"></i>
                    </button>
                    <button onclick="window.execMenu('copy')" class="w-full text-left px-5 py-3.5 md:px-4 md:py-2.5 text-[15px] md:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl flex items-center justify-between group transition-colors">
                        Copy <i data-lucide="copy" class="w-5 h-5 md:w-4 md:h-4 opacity-50 group-hover:opacity-100"></i>
                    </button>
                    <button onclick="window.execMenu('pin')" class="w-full text-left px-5 py-3.5 md:px-4 md:py-2.5 text-[15px] md:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl flex items-center justify-between group transition-colors">
                        Pin <i data-lucide="pin" class="w-5 h-5 md:w-4 md:h-4 opacity-50 group-hover:opacity-100"></i>
                    </button>
                    <button onclick="window.execMenu('star')" class="w-full text-left px-5 py-3.5 md:px-4 md:py-2.5 text-[15px] md:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl flex items-center justify-between group transition-colors">
                        Star <i data-lucide="star" class="w-5 h-5 md:w-4 md:h-4 opacity-50 group-hover:opacity-100"></i>
                    </button>
                    <button onclick="window.execMenu('delete')" class="w-full text-left px-5 py-3.5 md:px-4 md:py-2.5 text-[15px] md:text-sm text-red-500 hover:bg-red-500/10 rounded-xl flex items-center justify-between group transition-colors">
                        Delete <i data-lucide="trash-2" class="w-5 h-5 md:w-4 md:h-4 opacity-50 group-hover:opacity-100"></i>
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();
        loadHistory(branchId, isGroup, groupId);
        refreshPins();
        window.toggleMobileChatView('chat');

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#contextMenu') && !e.target.closest('.msg-options')) {
                document.getElementById('contextMenu')?.classList.add('hidden');
            }
            if (!e.target.closest('#emojiPicker') && !e.target.closest('button[onclick*="toggleEmojiPicker"]')) {
                document.getElementById('emojiPicker')?.classList.add('hidden');
            }
            if (!e.target.closest('#attachmentMenu') && !e.target.closest('button[onclick*="toggleAttachments"]')) {
                document.getElementById('attachmentMenu')?.classList.add('hidden');
            }
        });

        if (isGroup) {
            dbMessages.markRead(null, state.role, groupId, !groupId).then(() => {
                if (window.checkNotifications) window.checkNotifications(true);
            });
        } else if (branchId) {
            dbMessages.markRead(branchId, state.role).then(() => {
                if (window.checkNotifications) window.checkNotifications(true);
            });
        }

        window.updateChatPresenceUI();
    }

    window.updateChatPresenceUI = function () {
        const indicator = document.getElementById('chatPresenceIndicator');
        if (!indicator) return;

        const onlineUsersRaw = window.onlineUsers || {};
        const onlineMap = {};
        Object.keys(onlineUsersRaw).forEach(k => onlineMap[k.toLowerCase()] = onlineUsersRaw[k]);

        if (_isGroupChat) {

            const isAnyoneTypingGlobal = !!_typingState['group_global'];
            const isAnyoneTypingGroup = _activeGroupId && !!_typingState[String(_activeGroupId).toLowerCase()];

            if (isAnyoneTypingGlobal || isAnyoneTypingGroup) {
                indicator.innerHTML = `
                    <span class="flex items-center gap-1.5">
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                        <p class="text-[11px] text-emerald-500 font-bold ml-0.5 tracking-tight">typing...</p>
                    </span>`;
                return;
            }

            if (_activeGroup?.is_global) {
                const onlineCount = Object.keys(onlineMap).length;
                indicator.innerHTML = `
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 ${onlineCount > 0 ? 'animate-pulse' : 'opacity-20'}"></span>
                    <p class="text-[11px] text-emerald-500 font-medium tracking-tight">${onlineCount} online</p>
                `;
            } else if (_activeGroup) {
                const members = _activeGroup.group_members || [];
                const onlineCount = members.filter(m => onlineMap[String(m.branch_id || '').toLowerCase()] || onlineMap[String(m.owner_id || '').toLowerCase()]).length;
                indicator.innerHTML = `
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 ${onlineCount > 0 ? 'animate-pulse' : 'opacity-20'}"></span>
                    <p class="text-[11px] text-emerald-500 font-medium tracking-tight">${onlineCount} online</p>
                `;
            }
        } else {

            let targetId = String(_activeBranchId || '').toLowerCase();
            if (state.role === 'branch') {
                targetId = String(state.ownerId || (state.branches && state.branches[0]?.owner_id) || '').toLowerCase();
            }

            if (_typingState[targetId]) {
                indicator.innerHTML = `
                    <span class="flex items-center gap-1.5">
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                        <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                        <p class="text-[11px] text-emerald-500 font-bold ml-0.5 tracking-tight">typing...</p>
                    </span>`;
                return;
            }

            const isOnline = onlineMap[targetId];
            indicator.innerHTML = isOnline ? `
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p class="text-[11px] text-emerald-500 font-medium tracking-tight">online</p>
            ` : `
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-40"></span>
                <p class="text-[11px] text-gray-400 font-medium tracking-tight">offline</p>
            `;
        }
    };

    async function renderBranchChat(container) {
        container.innerHTML = `
            <div id="chatMainContainer" class="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto shadow-2xl rounded-[1.5rem] overflow-hidden border border-gray-200 dark:border-white/10 bg-[var(--chat-bg)]">
                <div class="flex h-full">
                    <!-- Sidebar (WhatsApp Style) -->
                    <div id="chatSidebar" class="w-full md:w-20 border-r border-gray-200 dark:border-white/10 flex flex-col items-center py-6 gap-6 bg-[var(--chat-sidebar)]">
                        <button onclick="window.toggleBranchChat(false)" id="dmBtn" class="w-12 h-12 rounded-full transition-all flex items-center justify-center relative shadow-sm" title="Direct Messages">
                            <i data-lucide="message-square" class="w-6 h-6"></i>
                            <div id="dmBadge" class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full hidden border-2 border-[var(--chat-sidebar)]"></div>
                        </button>
                        <button onclick="window.toggleBranchChat(true)" id="groupBtn" class="w-12 h-12 rounded-full transition-all flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-gray-500" title="Global Room">
                            <i data-lucide="globe" class="w-6 h-6"></i>
                        </button>

                        <!-- Groups list for branch -->
                        <div id="groupChatList" class="flex flex-col gap-4 overflow-y-auto px-2"></div>

                        <div class="mt-auto flex flex-col gap-6 items-center pb-4 text-gray-400 dark:text-gray-500">
                            <button onclick="window.toggleSidebarMenu(event)" class="hover:text-yellow-500 transition-all active:scale-95" title="Starred Messages"><i data-lucide="star" class="w-6 h-6"></i></button>
                            <button onclick="window.toggleSidebarMenu(event)" class="hover:text-emerald-500 transition-all active:scale-95" title="Archived Chats"><i data-lucide="archive" class="w-6 h-6"></i></button>
                            <button onclick="window.toggleSidebarMenu(event)" class="hover:text-emerald-500 transition-all active:scale-95" title="Chat Settings"><i data-lucide="settings" class="w-6 h-6"></i></button>
                        </div>
                    </div>
                    <!-- Chat Container -->
                    <div id="chatWindow" class="flex-1 flex flex-col bg-[var(--chat-bg)]"></div>
                </div>
            </div>
            <!-- Global Dropdown Container (Shared) -->
            <div id="globalDropdown" class="fixed hidden z-[100] bg-white dark:bg-[#1f2c33] rounded-2xl shadow-2xl py-2 w-56 border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-150"></div>
        `;
        lucide.createIcons();
        window.toggleBranchChat(false);
        updateGroupList();
    }

    window.toggleBranchChat = function (isGroup) {
        _isGroupChat = isGroup;
        const dmBtn = document.getElementById('dmBtn');
        const groupBtn = document.getElementById('groupBtn');

        if (isGroup) {
            _activeBranchId = null;
            _activeGroupId = null;
            groupBtn?.classList.add('bg-emerald-500', 'text-white', 'shadow-lg');
            groupBtn?.classList.remove('text-gray-500', 'hover:bg-black/5', 'dark:hover:bg-white/5');
            dmBtn?.classList.add('text-gray-500', 'hover:bg-black/5', 'dark:hover:bg-white/5');
            dmBtn?.classList.remove('bg-emerald-500', 'text-white', 'shadow-lg');
            renderConversation(null, true);
        } else {
            _activeGroupId = null;
            if (state.role === 'branch') _activeBranchId = state.branchId;
            dmBtn?.classList.add('bg-emerald-500', 'text-white', 'shadow-lg');
            dmBtn?.classList.remove('text-gray-500', 'hover:bg-black/5', 'dark:hover:bg-white/5');
            groupBtn?.classList.add('text-gray-500', 'hover:bg-black/5', 'dark:hover:bg-white/5');
            groupBtn?.classList.remove('bg-emerald-500', 'text-white', 'shadow-lg');
            renderConversation(state.branchId, false);
        }
    };

    async function loadHistory(branchId, isGroup, groupId = null) {
        const historyDiv = document.getElementById('messageHistory');
        if (!historyDiv) return;

        try {
            const messages = await dbMessages.fetchConversation(branchId, isGroup, groupId);
            _activeMessages = messages;

            if (!isGroup && branchId) {
                await dbMessages.markRead(branchId, state.role);

                window.realtimeChannel?.send({
                    type: 'broadcast',
                    event: 'sync',
                    payload: {
                        table: 'messages',
                        eventType: 'UPDATE',
                        new: { branch_id: branchId, is_read: true, is_delivered: true, is_group: false }
                    }
                });
            }

            if (messages.length === 0) {
                historyDiv.innerHTML = `<div class="p-20 text-center opacity-40 italic text-sm text-[var(--text-primary)]">End-to-end encrypted.</div>`;
                return;
            }

            historyDiv.innerHTML = messages.map((msg, idx) => {
                const isMine = (state.role === 'owner' && msg.sender_role === 'owner') ||
                    (state.role === 'branch' && msg.sender_role === 'branch' && msg.branch_id === state.branchId);

                const parent = msg.parent_id ? messages.find(m => m.id === msg.parent_id) : null;
                const isNewGroup = idx === 0 || messages[idx - 1].sender_name !== msg.sender_name;

                const reactions = (msg.reactions || []).filter(r => r.emoji !== '➕');
                const reactionMap = {};
                reactions.forEach(r => reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1);
                const reactionHtml = Object.entries(reactionMap).map(([emoji, count]) => `
                    <div class="bg-white dark:bg-[#1f2c33] rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-1 scale-[0.8] origin-left">
                        <span>${emoji}</span>
                        ${count > 1 ? `<span class="text-[9px] font-bold text-gray-500 dark:text-white/60">${count}</span>` : ''}
                    </div>
                `).join('');

                const attachment = msg.metadata?.attachment;
                const attachmentHtml = attachment ? renderAttachment(attachment, isMine) : '';

                const avatarEl = !isMine
                    ? (isNewGroup
                        ? (isGroup

                            ? `<div class="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 self-end mb-1 text-[10px] font-black text-emerald-600 uppercase shadow-sm">${(msg.sender_name || '?').charAt(0)}</div>`

                            : (_counterpartAvatarUrl
                                ? `<img src="${_counterpartAvatarUrl}" alt="Avatar" class="w-7 h-7 rounded-full object-cover flex-shrink-0 self-end mb-1 shadow-sm" onerror="this.style.display='none'">`
                                : `<div class="w-7 h-7 rounded-full bg-gray-300 dark:bg-white/10 flex items-center justify-center flex-shrink-0 self-end mb-1 text-[10px] font-black text-gray-500 uppercase shadow-sm">${(msg.sender_name || '?').charAt(0)}</div>`))

                        : `<div class="w-7 flex-shrink-0"></div>`)
                    : '';

                return `
                    <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'} ${isNewGroup ? 'pt-4' : 'pt-0.5'}"
                         id="msg-${msg.id}">
                        <div class="${!isMine ? 'flex items-end gap-1.5' : ''}">
                            ${avatarEl}
                        <div class="group relative max-w-[85%] md:max-w-[70%]">
                            <!-- Options Dropdown (Desktop) -->
                            <button onclick="window.showContextMenu(event, '${msg.id}')"
                                    class="msg-options absolute top-1 right-1 p-1 bg-white/40 dark:bg-black/20 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 text-gray-600 dark:text-gray-300 hover:bg-white/60">
                                <i data-lucide="chevron-down" class="w-4 h-4"></i>
                            </button>

                            <div onmousedown="window.handleMessageDown(event, '${msg.id}')"
                                 onmouseup="window.handleMessageUp()"
                                 ontouchstart="window.handleMessageDown(event, '${msg.id}')"
                                 ontouchend="window.handleMessageUp()"
                                 class="relative ${isMine ?
                        'msg-bubble-mine rounded-lg rounded-tr-none shadow-sm' :
                        'msg-bubble-other rounded-lg rounded-tl-none shadow-sm'} px-3 py-1.5 ${reactions.length ? 'mb-3' : ''} min-w-[70px] cursor-pointer active:scale-[0.99] transition-transform">

                                ${!isMine && isNewGroup && isGroup ? `<p class="text-[11px] font-black text-emerald-500 mb-0.5 tracking-tight">${msg.sender_name}</p>` : ''}

                                ${parent ? `
                                    <div class="mb-1.5 overflow-hidden rounded-md border-l-4 border-emerald-500 bg-black/5 dark:bg-white/5 p-2 pr-4 flex flex-col gap-0.5 max-w-[320px]">
                                        <p class="text-[10px] font-black text-emerald-500 uppercase tracking-tight">${parent.sender_name}</p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate italic leading-tight">${parent.content}</p>
                                    </div>
                                ` : ''}

                                ${attachmentHtml}

                                <div class="block w-full">
                                    <span class="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">${msg.content}</span>
                                    <span class="float-right inline-flex items-center gap-1.5 opacity-60 ml-4 mt-1 relative top-[3px]">
                                        <span class="text-[9px] font-black uppercase tracking-tight">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        ${isMine ? `
                                            <span class="flex items-center gap-1">
                                                <span class="text-[7px] font-black uppercase tracking-tighter opacity-80 mt-[1px]">
                                                    ${(msg.metadata?.attachment && localStorage.getItem(`dl_${msg.metadata.attachment.url}`)) ?
                            'Opened' :
                            (msg.is_read ? 'Read' : (msg.is_delivered ? 'Delivered' : 'Sent'))}
                                                </span>
                                                ${msg.is_read ?
                            '<i data-lucide="check-check" class="w-[14px] h-[14px] text-blue-400"></i>' :
                            (msg.is_delivered ?
                                '<i data-lucide="check-check" class="w-[14px] h-[14px] text-gray-400/80"></i>' :
                                '<i data-lucide="check" class="w-[14px] h-[14px] text-gray-400/80"></i>')
                        }
                                            </span>
                                        ` : ''}
                                    </span>
                                    <div class="clear-both"></div>
                                </div>

                                 <!-- Floating Reactions -->
                                 ${reactionHtml ? `<div class="absolute -bottom-3.5 ${isMine ? 'right-2' : 'left-2'} flex gap-1 z-10">${reactionHtml}</div>` : ''}
                            </div>
                        </div>
                        </div>
                    </div>
                `;
            }).join('');

            lucide.createIcons();
            historyDiv.scrollTop = historyDiv.scrollHeight;
        } catch (e) {
            historyDiv.innerHTML = `<div class="p-10 text-center text-red-500 text-xs">Failed to load history</div>`;
        }
    }

    function renderAttachment(att, isMine) {
        if (!att) return '';

        const isImage = att.type?.startsWith('image/');
        const isVideo = att.type?.startsWith('video/');
        const isAudio = att.isAudio || att.type?.startsWith('audio/');

        const bgClass = isMine ? 'bg-black/10' : 'bg-gray-100 dark:bg-white/5';
        const labelClass = isMine ? 'text-white' : 'text-gray-800 dark:text-gray-200';
        const subLabelClass = isMine ? 'text-white/60' : 'text-gray-400';

        if (isImage) {
            return `<img src="${att.url}" class="rounded-lg mb-2 max-h-[300px] w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                         onclick="window.openAttachment('${att.url}', '${att.name || 'image.png'}')">`;
        }

        if (isVideo) {
            return `<video src="${att.url}" controls class="rounded-lg mb-2 max-h-[300px] w-full object-cover"></video>`;
        }

        if (isAudio) {
            return `
                <div class="flex flex-col gap-2 p-3 ${bgClass} rounded-xl mb-2 min-w-[240px]">
                    <div class="flex items-center gap-3">
                        <button onclick="window.toggleAudio(this, '${att.url}')"
                                class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <i data-lucide="play" class="w-5 h-5 ml-0.5"></i>
                        </button>
                        <div class="flex-1">
                            <div class="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                <div class="audio-progress h-full bg-emerald-500 transition-all duration-300" style="width: 0%"></div>
                            </div>
                            <div class="flex justify-between mt-1.5">
                                <span class="audio-time text-[10px] font-black uppercase tracking-widest ${subLabelClass}">0:00</span>
                                <i data-lucide="mic" class="w-3 h-3 ${subLabelClass}"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div onclick="window.openAttachment('${att.url}', '${att.name}')"
                 class="flex items-center gap-3 p-3 ${bgClass} rounded-xl cursor-pointer hover:opacity-80 transition-all mb-2 ring-1 ring-black/5 dark:ring-white/5">
                <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <i data-lucide="file-text" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-bold truncate ${labelClass}">${att.name}</p>
                    <p class="text-[10px] font-black uppercase tracking-widest ${subLabelClass}">${(att.size / 1024).toFixed(1)} KB</p>
                </div>
                ${!localStorage.getItem(`dl_${att.url}`) ? `<i data-lucide="download" class="w-4 h-4 opacity-40"></i>` : ''}
            </div>
        `;
    }

    let _activeAudio = null;
    let _activeAudioBtn = null;

    window.toggleAudio = function (btn, url) {
        if (_activeAudio && _activeAudio.src === url) {
            if (_activeAudio.paused) {
                _activeAudio.play();
                btn.innerHTML = '<i data-lucide="pause" class="w-5 h-5"></i>';
            } else {
                _activeAudio.pause();
                btn.innerHTML = '<i data-lucide="play" class="w-5 h-5 ml-0.5"></i>';
            }
            lucide.createIcons();
            return;
        }

        if (_activeAudio) {
            _activeAudio.pause();
            if (_activeAudioBtn) _activeAudioBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5 ml-0.5"></i>';
        }

        const audio = new Audio(url);
        _activeAudio = audio;
        _activeAudioBtn = btn;

        audio.play();
        btn.innerHTML = '<i data-lucide="pause" class="w-5 h-5"></i>';
        lucide.createIcons();

        const progressBar = btn.parentElement.querySelector('.audio-progress');
        const timeDisplay = btn.parentElement.querySelector('.audio-time');

        audio.ontimeupdate = () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;

            const mins = Math.floor(audio.currentTime / 60);
            const secs = Math.floor(audio.currentTime % 60);
            if (timeDisplay) timeDisplay.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        audio.onended = () => {
            btn.innerHTML = '<i data-lucide="play" class="w-5 h-5 ml-0.5"></i>';
            if (progressBar) progressBar.style.width = '0%';
            if (timeDisplay) timeDisplay.innerText = '0:00';
            lucide.createIcons();
        };
    };

    window.openAttachment = async function (url, filename = 'download') {
        try {
            showToast('Downloading file...', 'info');
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            localStorage.setItem(`dl_${url}`, 'true');
            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
        } catch (error) {
            console.error('Download failed:', error);
            showToast('Download failed. Opening in browser instead.', 'warning');
            window.open(url, '_blank');
        }
    };

    window.showContextMenu = function (e, msgId) {
        e.preventDefault();
        e.stopPropagation();
        _activeContextMenu = _activeMessages.find(m => m.id === msgId);

        const menu = document.getElementById('contextMenu');
        menu.classList.remove('hidden');

        if (window.innerWidth > 768) {

            const x = Math.min(e.clientX, window.innerWidth - 280);
            const y = Math.min(e.clientY, window.innerHeight - 380);

            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.style.bottom = 'auto';
        } else {

            menu.style.left = '0';
            menu.style.top = 'auto';
            menu.style.bottom = '0';
        }
        lucide.createIcons();
    };

    window.execMenu = function (action) {
        if (!_activeContextMenu) return;
        const msg = _activeContextMenu;
        document.getElementById('contextMenu').classList.add('hidden');

        if (action === 'reply') window.replyToMessage(msg.id);
        if (action === 'copy') {
            navigator.clipboard.writeText(msg.content);
            showToast('Copied to clipboard');
        }
        if (action === 'pin' && state.role === 'owner') {
            window.pinMessageForBranch(msg.id, msg.branch_id);
        }
        if (action === 'star') {
            dbMessages.starMessage(msg.id, state.profile.id)
                .then(() => showToast('Message starred', 'success'))
                .catch(e => showToast('Failed to star', 'error'));
        }
        if (action === 'delete') {
            window.handleDeleteMessage(msg.id);
        }
    };

    window.handleDeleteMessage = async function (msgId) {
        const isOwner = state.role === 'owner';
        const choices = isOwner ? ['Delete for everyone', 'Delete for me', 'Cancel'] : ['Delete for me', 'Cancel'];

        const choice = await new Promise(resolve => {

            const msg = isOwner ? "Delete for everyone (Permanent) or just for you?" : "Delete this message from your view?";
            if (isOwner) {
                if (confirm("Permanently delete for everyone? OK = Everyone, Cancel = Just for me")) resolve('everyone');
                else resolve('me');
            } else {
                if (confirm("Delete for me?")) resolve('me');
                else resolve('cancel');
            }
        });

        try {
            if (choice === 'everyone' && isOwner) {
                await dbMessages.hardDelete(msgId);
                showToast('Deleted for everyone', 'success');
            } else if (choice === 'me') {
                const userId = state.role === 'owner' ? state.profile.id : state.branchId;
                await dbMessages.softDelete(msgId, userId);
                showToast('Removed from your view');
            }
            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
        } catch (e) {
            showToast('Failed to delete', 'error');
        }
    };

    window.applyReaction = async function (emoji) {
        if (!_activeContextMenu) return;
        const msgId = _activeContextMenu.id;
        document.getElementById('contextMenu').classList.add('hidden');

        try {
            await dbMessages.toggleReaction(msgId, emoji, { id: state.profile.id, name: state.currentUser });
            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
            if (localStorage.getItem('chatPref_sounds') !== 'false') playSound('pop-alert');
        } catch (e) {
            showToast('Failed to react', 'error');
        }
    };

    window.handleMessageDown = function (e, msgId) {
        _longPressTimer = setTimeout(() => {
            window.showContextMenu(e, msgId);
            if (navigator.vibrate) navigator.vibrate([15]);
        }, 500);
    };

    window.handleMessageUp = function () {
        clearTimeout(_longPressTimer);
    };

    window.replyToMessage = function (msgId) {
        const msg = _activeMessages.find(m => m.id === msgId);
        if (!msg) return;

        _replyingTo = msg;
        const preview = document.getElementById('replyPreview');
        document.getElementById('replyToName').innerText = msg.sender_name;
        document.getElementById('replyToContent').innerText = msg.content;
        preview.classList.remove('hidden');
        document.getElementById('chatInput').focus();
        lucide.createIcons();
    };

    window.cancelReply = function () {
        _replyingTo = null;
        document.getElementById('replyPreview').classList.add('hidden');
    };

    window.handleChatSubmit = async function (e) {
        if (e) e.preventDefault();
        const input = document.getElementById('chatInput');

        if (_recordedBlob && !document.getElementById('reviewBar').classList.contains('hidden')) {
            window.sendVoiceNote();
            return;
        }

        const mic = document.getElementById('micIcon') || document.querySelector('#sendChatBtn #micIcon');
        if (mic && !mic.classList.contains('hidden')) {
            window.startRecording();
            return;
        }

        const content = input.value.trim();
        if (!content && !window._pendingAttachment) return;

        const payload = {
            branch_id: _activeBranchId,
            is_group: _isGroupChat,
            group_id: _activeGroupId,
            parent_id: _replyingTo?.id || null,
            sender_id: state.role === 'owner' ? state.ownerId : state.branchId,
            sender_role: state.role,
            sender_name: state.currentUser,
            content: content,
            metadata: { attachment: window._pendingAttachment || null }
        };

        const autoPinTarget = (_isGroupChat && _replyingTo && _replyingTo.branch_id) ? _replyingTo.branch_id : null;
        input.value = '';
        input.style.height = '';
        window.cancelReply();

        window.handleChatInput(input, true);

        try {
            const res = await dbMessages.send(payload);

            window.realtimeChannel?.send({
                type: 'broadcast',
                event: 'sync',
                payload: { table: 'messages', eventType: 'INSERT', new: res }
            });

            if (autoPinTarget && state.role === 'owner') await dbMessages.pinForBranch(res.id, autoPinTarget);
            window._pendingAttachment = null;
            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
            if (localStorage.getItem('chatPref_sounds') !== 'false') playSound('pop-alert');
        } catch (e) {
            showToast('Failed to send', 'error');
        }
    };

    window.handleChatInput = function (input, forceStop = false) {

        if (window.realtimeChannel) {
            const isTyping = !forceStop && input.value.trim().length > 0;

            window.realtimeChannel.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    id: state.role === 'owner' ? state.ownerId : state.branchId,
                    name: state.currentUser,
                    is_typing: isTyping,
                    is_group: _isGroupChat,
                    group_id: _isGroupChat ? _activeGroupId : undefined
                }
            });

            clearTimeout(_myTypingTimer);
            if (isTyping) {
                _myTypingTimer = setTimeout(() => {
                    window.handleChatInput(input, true);
                }, 3000);
            }
        }

        input.style.height = 'auto';
        input.style.height = (input.scrollHeight) + 'px';
        const btn = document.getElementById('sendChatBtn');
        const mic = btn?.querySelector('#micIcon') || document.getElementById('micIcon');
        const send = btn?.querySelector('#sendIcon') || document.getElementById('sendIcon');
        if (input.value.length > 0) {
            mic?.classList.add('hidden');
            send?.classList.remove('hidden');
        } else {
            mic?.classList.remove('hidden');
            send?.classList.add('hidden');
        }
    };

    window.handleTypingIndicator = function (event) {

        const payload = event?.payload || event;
        const indicator = document.getElementById('chatPresenceIndicator');

        const ownerId = state.ownerId || state.profile?.id;

        let isMatch = false;
        let typingKey = null;

        const currentTyperId = String(payload.id || '').toLowerCase();
        const activeBranchIdNormal = String(_activeBranchId || '').toLowerCase();
        const myOwnerIdNormal = String(ownerId || '').toLowerCase();
        const myBranchIdNormal = String(state.branchId || '').toLowerCase();

        if (payload.is_group && payload.group_id) {

            typingKey = `group_${String(payload.group_id).toLowerCase()}`;
            isMatch = _isGroupChat && String(_activeGroupId || '').toLowerCase() === String(payload.group_id).toLowerCase();
        } else if (payload.is_group && !payload.group_id) {

            typingKey = 'group_global';
            isMatch = _isGroupChat && _activeGroupId === null;
        } else {

            if (state.role === 'owner') {

                typingKey = currentTyperId;
                isMatch = currentTyperId === activeBranchIdNormal;
            } else {

                if (currentTyperId === myOwnerIdNormal) {
                    typingKey = myOwnerIdNormal;
                    isMatch = _activeBranchId === state.branchId && !_isGroupChat;
                }
            }
        }

        if (typingKey) {
            _typingState[typingKey] = !!payload.is_typing;
            clearTimeout(_typingListTimers[typingKey]);

            if (payload.is_typing) {

                _typingListTimers[typingKey] = setTimeout(() => {
                    _typingState[typingKey] = false;
                    _patchSidebarTyping(typingKey, false, payload.name);
                }, 4000);
            }
            _patchSidebarTyping(typingKey, !!payload.is_typing, payload.name);
        }

        if (!indicator || !isMatch) return;

        if (payload.is_typing) {
            indicator.innerHTML = `
                <span class="flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                    <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                    <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                    <p class="text-[11px] text-emerald-500 font-bold ml-0.5 tracking-tight">typing...</p>
                </span>`;
            clearTimeout(_typingTimeout);
            _typingTimeout = setTimeout(() => window.updateChatPresenceUI?.(), 3000);
        } else {
            clearTimeout(_typingTimeout);
            window.updateChatPresenceUI?.();
        }
    };

    function _patchSidebarTyping(typingKey, isTyping, senderName) {

        const snippetEl = document.querySelector(`[data-typing-key="${typingKey}"] .typing-snippet`);
        if (!snippetEl) return;

        if (isTyping) {
            snippetEl.innerHTML = `
                <span class="flex items-center gap-1 text-emerald-500">
                    <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                    <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                    <span class="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                    <span class="text-[9px] font-bold ml-0.5">typing...</span>
                </span>`;
        } else {

            const btn = snippetEl.closest('[data-typing-key]');
            snippetEl.innerHTML = `<span class="text-[9px] text-gray-500 dark:text-gray-400 truncate opacity-80 font-medium">${btn?.dataset.snippet || ''}</span>`;
        }
    }

    window.startRecording = async function () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            _audioChunks = [];
            _mediaRecorder = new MediaRecorder(stream);

            _mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) _audioChunks.push(e.data);
            };

            _mediaRecorder.onstop = () => {
                _recordedBlob = new Blob(_audioChunks, { type: 'audio/webm' });
                document.getElementById('recordingBar').classList.add('hidden');
                document.getElementById('reviewBar').classList.remove('hidden');

                document.getElementById('micIcon').classList.add('hidden');
                document.getElementById('sendIcon').classList.remove('hidden');

                lucide.createIcons();
            };

            _mediaRecorder.start();
            _recordingStartTime = Date.now();

            document.getElementById('recordingBar').classList.remove('hidden');
            document.getElementById('recordingTimer').innerText = '0:00';

            _recordingTimerInterval = setInterval(updateRecordingTimer, 1000);

            if (navigator.vibrate) navigator.vibrate(50);
        } catch (err) {
            console.error('Mic access denied:', err);
            showToast('Microphone access is required for voice notes', 'warning');
        }
    };

    window.stopRecording = function () {
        if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
            _mediaRecorder.stop();
            _mediaRecorder.stream.getTracks().forEach(track => track.stop());
            clearInterval(_recordingTimerInterval);
        }
    };

    window.cancelRecording = function () {
        if (_mediaRecorder) {
            _mediaRecorder.stop();
            _mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        clearInterval(_recordingTimerInterval);
        _audioChunks = [];
        document.getElementById('recordingBar').classList.add('hidden');

        const input = document.getElementById('chatInput');
        if (input.value.trim().length === 0) {
            document.getElementById('micIcon').classList.remove('hidden');
            document.getElementById('sendIcon').classList.add('hidden');
        }

        if (navigator.vibrate) navigator.vibrate(20);
    };

    window.discardVoiceNote = function () {
        _recordedBlob = null;
        _audioChunks = [];
        document.getElementById('reviewBar').classList.add('hidden');

        document.getElementById('micIcon').classList.remove('hidden');
        document.getElementById('sendIcon').classList.add('hidden');
        lucide.createIcons();
    };

    window.sendVoiceNote = async function () {
        if (!_recordedBlob) return;

        const sendBtn = document.getElementById('sendChatBtn');
        const originalHtml = sendBtn.innerHTML;
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>`;

        try {
            const file = new File([_recordedBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
            const attachment = await dbMessages.uploadFile(file, 'voice-notes');

            const payload = {
                branch_id: _activeBranchId,
                is_group: _isGroupChat,
                group_id: _activeGroupId,
                sender_role: state.role,
                sender_name: state.currentUser,
                content: 'Voice Message',
                metadata: {
                    attachment: {
                        ...attachment,
                        isAudio: true
                    }
                }
            };

            await dbMessages.send(payload);
            window.discardVoiceNote();
            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
            if (localStorage.getItem('chatPref_sounds') !== 'false') playSound('pop-alert');
        } catch (e) {
            console.error('Failed to send voice note:', e);
            showToast('Failed to send voice note', 'error');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalHtml;
        }
    };

    function updateRecordingTimer() {
        const elapsed = Math.floor((Date.now() - _recordingStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('recordingTimer').innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    window.triggerFileSelect = function (type) {
        const input = document.getElementById('chatFileInput');
        if (!input) return;

        input.removeAttribute('capture');

        if (type === 'image') {
            input.accept = 'image/*,video/*';
        } else if (type === 'doc') {
            input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
        } else if (type === 'camera') {
            input.accept = 'image/*';
            input.setAttribute('capture', 'environment');
        } else {
            input.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
        }

        input.click();
        document.getElementById('attachmentMenu')?.classList.add('hidden');
    };

    window.toggleAttachmentMenu = function (e) {
        e.stopPropagation();
        const menu = document.getElementById('attachmentMenu');
        menu?.classList.toggle('hidden');

        const closeMenu = (ev) => {
            if (!ev.target.closest('#attachmentMenu')) {
                menu?.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        };
        if (!menu?.classList.contains('hidden')) {
            document.addEventListener('click', closeMenu);
        }
        lucide.createIcons();
    };

    window.handleAttachment = async function (input) {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showToast('File too large (Max 10MB)', 'warning');
            input.value = '';
            return;
        }

        try {
            showToast(`Uploading ${file.name}...`, 'info');
            const att = await dbMessages.uploadFile(file);
            window._pendingAttachment = att;
            showToast('File ready to send!', 'success');

            const inputEl = document.getElementById('chatInput');
            if (!inputEl.value.trim()) {
                inputEl.value = `[Document: ${file.name}] `;
                inputEl.dispatchEvent(new Event('input'));
            }
            inputEl.focus();
        } catch (err) {
            showToast('Upload failed: ' + err.message, 'error');
        } finally {
            input.value = '';
        }
    };

    window.pinMessageForBranch = async function (msgId, branchId) {
        if (!branchId || branchId === 'null') return;
        try {
            await dbMessages.pinForBranch(msgId, branchId);
            showToast('Pinned!');
        } catch (e) { }
    };

    async function refreshPins() {
        const area = document.getElementById('pinsArea');
        if (!area || state.role !== 'branch') return;

        try {
            const pins = await dbMessages.fetchPins(state.branchId);
            if (pins.length === 0) { area.classList.add('hidden'); return; }

            area.classList.remove('hidden');
            area.innerHTML = pins.slice(0, 1).map(pin => `
                <div class="flex items-center justify-between bg-white dark:bg-[#1f2c33] border-l-4 border-emerald-500 p-3 rounded-r-xl shadow-sm animate-in slide-in-from-top-2">
                    <div class="flex-1 min-w-0 pr-4">
                        <p class="text-[10px] font-black text-emerald-500 uppercase leading-none mb-1">Direct Note from Admin</p>
                        <p class="text-xs text-gray-700 dark:text-gray-300 truncate italic">"${pin.messages.content}"</p>
                    </div>
                    <button onclick="window.dismissPin('${pin.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
                         <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            `).join('');
            lucide.createIcons();
        } catch (e) { }
    }

    window.dismissPin = async function (pinId) {
        try { await dbMessages.dismissPin(pinId); refreshPins(); } catch (e) { }
    };

    window.toggleMobileChatView = function (view) {
        const container = document.getElementById('chatMainContainer');
        if (!container) return;

        if (view === 'chat') {
            container.classList.add('chat-active');

            if (window.innerWidth <= 768) {
                document.querySelector('header')?.classList.add('md:flex', 'hidden');
            }
        } else {
            container.classList.remove('chat-active');
            document.querySelector('header')?.classList.remove('md:flex', 'hidden');
            _activeBranchId = null;
            _isGroupChat = false;
        }
    };

    window.handleSidebarSearch = function (query) {
        const q = query.toLowerCase().trim();
        const branchItems = document.querySelectorAll('#branchChatList button');
        const groupItems = document.querySelectorAll('#groupChatList button');

        branchItems.forEach(item => {
            const name = item.querySelector('p')?.innerText.toLowerCase() || '';
            item.style.display = name.includes(q) ? 'flex' : 'none';
        });

        groupItems.forEach(item => {
            const name = item.querySelector('p')?.innerText.toLowerCase() || '';
            item.style.display = name.includes(q) ? 'flex' : 'none';
        });
    };

    window.refreshChat = function (payload) {
        if (!window.state || !state.profile) return;

        const eventType = payload.eventType || 'INSERT';
        const row = payload.new || payload.old;
        if (!row) return;

        if (payload.table === 'pinned_messages' && payload.new && String(payload.new.branch_id) === String(state.branchId)) {
            refreshPins();
            return;
        }

        const myId = state.role === 'owner' ? state.ownerId : state.branchId;
        const isSelf = String(row.sender_id) === String(myId) && row.sender_role === state.role;
        const isForUs = state.role === 'owner' || String(row.branch_id) === String(state.branchId) || row.is_group;

        if (isForUs) {
            debounce('chat-list-refresh', () => {
                window.updateBranchList?.();
                window.updateGroupList?.();
                if (window.checkNotifications) window.checkNotifications(true);
            }, 300);
        }

        const isGenuineNewIncoming = eventType === 'INSERT' && !isSelf && isForUs;
        if (isGenuineNewIncoming && !row.is_group) {
            dbMessages.markDelivered(row.branch_id, state.role);

            window.realtimeChannel?.send({
                type: 'broadcast',
                event: 'sync',
                payload: { table: 'messages', eventType: 'UPDATE', new: { ...row, is_delivered: true } }
            });
        }

        const activeTargetId = _isGroupChat ? _activeGroupId : _activeBranchId;

        const rowTargetId = row.is_group ? (row.group_id || null) : row.branch_id;

        let isMsgActive = false;
        if (row.is_group && _isGroupChat) {

            const aId = activeTargetId === null ? 'global' : String(activeTargetId).toLowerCase();
            const rId = rowTargetId === null ? 'global' : String(rowTargetId).toLowerCase();
            isMsgActive = aId === rId;
        } else if (!row.is_group && !_isGroupChat) {

            isMsgActive = activeTargetId != null && rowTargetId != null &&
                String(activeTargetId).toLowerCase() === String(rowTargetId).toLowerCase();
        }

        if (!isMsgActive && row.id) {
            isMsgActive = _activeMessages.some(m => String(m.id) === String(row.id));
        }

        if (isMsgActive) {

            if (eventType === 'UPDATE' || eventType === 'BROADCAST') {
                const idx = _activeMessages.findIndex(m => String(m.id) === String(row.id));
                if (idx > -1) {
                    _activeMessages[idx] = { ..._activeMessages[idx], ...row };
                }
            }

            if (isGenuineNewIncoming) {
                if (localStorage.getItem('chatMuted') !== 'true' && localStorage.getItem('chatPref_sounds') !== 'false') playSound('notification');
                if (row.is_group && _isGroupChat && (String(_activeGroupId) === String(row.group_id))) {
                    dbMessages.markRead(null, state.role, _activeGroupId, !_activeGroupId).then(() => {
                        if (window.checkNotifications) window.checkNotifications(true);
                    });
                } else if (!row.is_group && !_isGroupChat && _activeBranchId && (String(_activeBranchId) === String(row.branch_id))) {
                    dbMessages.markRead(_activeBranchId, state.role).then(() => {
                        if (window.checkNotifications) window.checkNotifications(true);
                    });

                    window.realtimeChannel?.send({
                        type: 'broadcast',
                        event: 'sync',
                        payload: { table: 'messages', eventType: 'UPDATE', new: { ...row, is_read: true, is_delivered: true } }
                    });
                }
            }

            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
        }
    };

    window.toggleEmojiPicker = function (e) {
        if (e) e.stopPropagation();
        const picker = document.getElementById('emojiPicker');
        if (!picker) return;

        const isHidden = picker.classList.contains('hidden');

        if (isHidden) {
            document.getElementById('attachmentMenu')?.classList.add('hidden');
            document.getElementById('contextMenu')?.classList.add('hidden');
            lucide.createIcons();
        }

        picker.classList.toggle('hidden');

        if (!picker.classList.contains('hidden')) {
            const closePicker = (ev) => {
                if (!ev.target.closest('#emojiPicker') && !ev.target.closest('button[onclick*="toggleEmojiPicker"]')) {
                    picker.classList.add('hidden');
                    document.removeEventListener('click', closePicker);
                }
            };

            setTimeout(() => document.addEventListener('click', closePicker), 10);
        }
    };

    window.scrollToEmojiCategory = function (catName) {
        const container = document.getElementById('emojiGridContainer');
        const section = document.getElementById(`emoji-cat-${catName.split(' ')[0]}`);
        if (container && section) {
            container.scrollTo({
                top: section.offsetTop - container.offsetTop,
                behavior: 'smooth'
            });
        }
    };

    window.handleEmojiSearch = function (query) {
        const q = query.toLowerCase().trim();
        const sections = document.querySelectorAll('.emoji-category-section');

        if (!q) {
            sections.forEach(sec => {
                sec.classList.remove('hidden');
                sec.querySelectorAll('.emoji-item').forEach(item => item.classList.remove('hidden'));
            });
            return;
        }

        sections.forEach(section => {
            const catName = section.querySelector('p').innerText.toLowerCase();
            const items = section.querySelectorAll('.emoji-item');
            let hasVisibleItems = false;

            if (catName.includes(q)) {
                section.classList.remove('hidden');
                items.forEach(item => item.classList.remove('hidden'));
                hasVisibleItems = true;
            } else {
                items.forEach(item => {
                    if (item.dataset.emoji === q || item.title.toLowerCase().includes(q)) {
                        item.classList.remove('hidden');
                        hasVisibleItems = true;
                    } else {
                        item.classList.add('hidden');
                    }
                });

                if (hasVisibleItems) section.classList.remove('hidden');
                else section.classList.add('hidden');
            }
        });
    };

    window.addEmoji = function (emoji) {
        const input = document.getElementById('chatInput');
        if (!input) return;

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const val = input.value;

        const mic = document.getElementById('micIcon');
        const send = document.getElementById('sendIcon');

        if ((val.substring(0, start) + emoji + val.substring(end)).trim().length > 0) {
            mic?.classList.add('hidden');
            send?.classList.remove('hidden');
        } else {
            mic?.classList.remove('hidden');
            send?.classList.add('hidden');
        }

        input.style.height = '';
        input.style.height = input.scrollHeight + 'px';
        input.value = val.substring(0, start) + emoji + val.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
        document.getElementById('emojiPicker')?.classList.add('hidden');
    };

    window.toggleSearch = function () {
        _isSearchOpen = !_isSearchOpen;
        const bar = document.getElementById('searchBar');
        bar?.classList.toggle('hidden');
        if (_isSearchOpen) {
            document.getElementById('msgSearchInput')?.focus();
        } else {
            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
        }
    };

    window.handleMsgSearch = function (query) {
        if (!query.trim()) {
            loadHistory(_activeBranchId, _isGroupChat, _activeGroupId);
            return;
        }
        const filtered = _activeMessages.filter(m =>
            m.content.toLowerCase().includes(query.toLowerCase()) ||
            m.sender_name.toLowerCase().includes(query.toLowerCase())
        );
        renderFilteredMessages(filtered, query);
    };

    function renderFilteredMessages(messages, query) {
        const historyDiv = document.getElementById('messageHistory');
        if (!historyDiv) return;

        if (messages.length === 0) {
            historyDiv.innerHTML = `<div class="p-20 text-center opacity-40 italic text-sm text-[var(--text-primary)]">No messages found matching "${query}"</div>`;
            return;
        }

        historyDiv.innerHTML = messages.map(msg => {
            const isMine = (state.role === 'admin' && msg.sender_role === 'admin') ||
                (state.role === 'branch' && msg.sender_role === 'branch' && msg.branch_id === state.branchId);

            return `
                <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'} pt-2">
                    <div class="px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 max-w-[80%]">
                        <p class="text-[10px] font-black text-emerald-500 mb-1">${msg.sender_name}</p>
                        <p class="text-sm text-[var(--text-primary)]">${msg.content.replace(new RegExp(query, 'gi'), match => `<mark class="bg-emerald-500/40 text-[var(--text-primary)] rounded px-0.5">${match}</mark>`)}</p>
                        <p class="text-[9px] text-gray-400 mt-1">${new Date(msg.created_at).toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.toggleHeaderMenu = function (e) {
        e.stopPropagation();
        const menuItems = [
            { label: 'Participants', icon: 'users' },
            { label: 'Mute Notifications', icon: 'bell-off' },
            { label: 'Clear Messages', icon: 'trash-2' },
            { label: 'Search Messages', icon: 'search' },
            { label: 'Export Chat History', icon: 'download' },
        ];
        showGlobalDropdown(e, menuItems);
    };

    window.toggleSidebarMenu = function (e) {
        e.stopPropagation();
        const menuItems = [
            { label: 'Create New Group', icon: 'users' },
            { label: 'Archived Chats', icon: 'archive' },
            { label: 'Starred Messages', icon: 'star' },
            { label: 'Chat Preferences', icon: 'settings' },
            { label: 'Privacy & Security', icon: 'shield' },
        ];
        showGlobalDropdown(e, menuItems);
    };

    window.handleNewChat = function () {
        if (state.role === 'owner') {
            openModal('addBranch');
        } else {
            showToast('Only Admins can add new chat branches', 'warning');
        }
    };

    function showGlobalDropdown(e, items) {
        const dropdown = document.getElementById('globalDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = items.map(item => `
            <button onclick="window.handleChatAction('${item.label}')" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between group transition-colors">
                ${item.label} <i data-lucide="${item.icon}" class="w-4 h-4 opacity-40 group-hover:opacity-100"></i>
            </button>
        `).join('');

        dropdown.classList.remove('hidden');
        lucide.createIcons();

        const x = Math.min(e.clientX, window.innerWidth - 240);
        const y = Math.min(e.clientY, window.innerHeight - 300);
        dropdown.style.left = `${x}px`;
        dropdown.style.top = `${y}px`;

        const closeDropdown = (ev) => {
            if (!ev.target.closest('#globalDropdown')) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
            }
        };
        document.addEventListener('click', closeDropdown);
    }

    window.handleChatAction = function (label) {
        document.getElementById('globalDropdown')?.classList.add('hidden');

        switch (label) {
            case 'Participants':
                let participants = [];
                if (_isGroupChat) {
                    if (_activeGroup?.is_global) {

                        participants = state.branches.map(b => ({ id: b.id, name: b.name, role: 'Branch' }));
                        const ownerId = state.ownerId || (state.branches && state.branches[0]?.owner_id);
                        participants.unshift({ id: ownerId, name: state.enterpriseName || 'Administrator', role: 'Owner' });
                    } else if (_activeGroup) {

                        participants = (_activeGroup.group_members || []).map(m => {
                            const b = state.branches.find(br => br.id === m.branch_id);
                            return { id: m.branch_id, name: b?.name || 'Unknown Branch', role: 'Branch' };
                        });
                        const ownerId = state.ownerId || (state.branches && state.branches[0]?.owner_id);
                        participants.unshift({ id: ownerId, name: state.enterpriseName || 'Administrator', role: 'Owner' });
                    }
                } else {

                    const ownerId = state.ownerId || (state.branches && state.branches[0]?.owner_id);
                    participants.push({ id: ownerId, name: state.enterpriseName || 'Administrator', role: 'Owner' });

                    const branch = state.branches.find(b => b.id === _activeBranchId);
                    if (branch) participants.push({ id: branch.id, name: branch.name, role: 'Branch' });
                }

                openModal('chatParticipants', { participants });
                break;
            case 'Mute Notifications':
                window.toggleMute();
                break;
            case 'Clear Messages':
                window.clearChat();
                break;
            case 'Search Messages':
                window.toggleSearch();
                break;
            case 'Export Chat History':
                window.exportChat();
                break;
            case 'Chat Preferences':
                openModal('chatPreferences');
                setTimeout(() => window.syncPrefUI(), 100);
                break;
            case 'Create New Group':
                openModal('chatCreateGroup');
                break;
            case 'Archived Chats':
                openModal('chatArchivedRooms');
                break;
            case 'Starred Messages':
                window.showStarredMessages();
                break;
            case 'Privacy & Security':
                showToast('Privacy settings coming soon in v2.1', 'info');
                break;
            default:
                showToast(`${label} integration is coming soon!`);
        }
    };

    window.handleCreateChatGroup = async function (e) {
        e.preventDefault();
        const name = document.getElementById('groupName').value;
        const selectedBranches = Array.from(document.querySelectorAll('input[name="groupBranches"]:checked')).map(i => i.value);

        if (selectedBranches.length === 0) {
            showToast('Select at least one branch', 'warning');
            return;
        }

        try {
            showToast('Creating group...', 'info');
            const group = await dbMessages.createGroup(name, selectedBranches, state.profile.id);
            closeModal();
            showToast(`Group "${name}" created!`, 'success');
            window.renderChatModule();
        } catch (err) {
            showToast('Failed to create group: ' + err.message, 'error');
        }
    };

    window.showStarredMessages = async function () {
        openModal('chatStarredMessages');
        const list = document.querySelector('.chat-starred-list') || document.getElementById('modalContent').querySelector('.space-y-4');
        try {
            const starred = await dbMessages.fetchStarred(state.profile.id);
            if (starred.length === 0) return;

            list.innerHTML = starred.map(s => `
                <div class="bg-white dark:bg-[#1f2c33] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black text-emerald-500 uppercase">${s.messages.sender_name}</span>
                        <span class="text-[9px] text-gray-400">${new Date(s.messages.created_at).toLocaleDateString()}</span>
                    </div>
                    <p class="text-sm text-[var(--text-primary)]">${s.messages.content}</p>
                </div>
            `).join('');
        } catch (err) {
            showToast('Failed to load starred messages', 'error');
        }
    };

    window.toggleMute = function () {
        const isMuted = localStorage.getItem('chatMuted') === 'true';
        localStorage.setItem('chatMuted', !isMuted);
        showToast(!isMuted ? 'Notifications muted' : 'Notifications enabled');
    };

    window.clearChat = function () {
        if (confirm('Are you sure you want to clear this conversation history? This action is visual-only for your current session.')) {
            const historyDiv = document.getElementById('messageHistory');
            if (historyDiv) {
                historyDiv.innerHTML = `<div class="p-20 text-center opacity-40 italic text-sm text-[var(--text-primary)]">Conversation cleared.</div>`;
            }
            showToast('Conversation cleared');
        }
    };

    window.exportChat = function () {
        if (!_activeMessages || _activeMessages.length === 0) {
            showToast('No messages to export', 'warning');
            return;
        }

        const title = _isGroupChat ? 'Global Room' : state.branches.find(b => b.id === _activeBranchId)?.name || 'Branch';
        const content = _activeMessages.map(m => `[${new Date(m.created_at).toLocaleString()}] ${m.sender_name}: ${m.content}`).join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Chat_Export_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Chat history exported');
    };

    window.toggleChatPref = function (key) {
        const current = localStorage.getItem(`chatPref_${key}`) === 'true';
        localStorage.setItem(`chatPref_${key}`, !current);
        window.syncPrefUI();
    };

    window.syncPrefUI = function () {
        const keys = ['sounds', 'enter'];
        keys.forEach(k => {
            const val = localStorage.getItem(`chatPref_${k}`) !== 'false';
            const btn = document.getElementById(`pref${k.charAt(0).toUpperCase() + k.slice(1)}`);
            if (btn) {
                const dot = btn.querySelector('div');
                if (val) {
                    btn.classList.add('bg-emerald-500');
                    btn.classList.remove('bg-gray-300', 'dark:bg-white/10');
                    dot.style.left = '1.75rem';
                } else {
                    btn.classList.remove('bg-emerald-500');
                    btn.classList.add('bg-gray-300', 'dark:bg-white/10');
                    dot.style.left = '0.25rem';
                }
            }
        });
    };

})();
