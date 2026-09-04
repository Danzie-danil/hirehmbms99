/**
 * Supabase-Style Search & Action Dropdown Component
 * Exactly reproduces the Supabase Dashboard SQL Editor / Resource Explorer header:
 * - Search input with expandable dropdown chevron
 * - Adjacent action (+) button with popover options
 * - Clean borders, dark mode fidelity, and Lucide icons
 */

import { DropdownMenu } from './dropdown.js';

export function createSupabaseSearchAction({
  placeholder = 'Search queries...',
  onSearch = null,
  onPlusClick = null,
  dropdownItems = [
    { text: 'Create a new snippet', icon: 'file-plus', onClick: () => console.log('Snippet') },
    { text: 'Create a new logs query', icon: 'scroll-text', onClick: () => console.log('Logs query') },
    { type: 'separator' },
    { text: 'Create a new folder', icon: 'folder-plus', onClick: () => console.log('Folder') }
  ],
  className = ''
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `flex items-center gap-2 font-sans ${className}`;

  // 1. Search + Dropdown trigger group
  const searchGroup = document.createElement('div');
  searchGroup.className = `
    relative flex items-center h-9 px-3 rounded-md border
    border-zinc-200 dark:border-zinc-800
    bg-white dark:bg-zinc-950
    text-zinc-800 dark:text-zinc-200
    focus-within:border-zinc-400 dark:focus-within:border-zinc-600
    focus-within:ring-1 focus-within:ring-emerald-500/30
    transition-all duration-150 shadow-sm
  `.replace(/\s+/g, ' ').trim();

  // Search Icon
  const searchIcon = document.createElement('i');
  searchIcon.setAttribute('data-lucide', 'search');
  searchIcon.className = 'w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mr-2';
  searchGroup.appendChild(searchIcon);

  // Search Input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.className = `
    w-full bg-transparent text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500
    focus:outline-none text-zinc-900 dark:text-zinc-100
  `.replace(/\s+/g, ' ').trim();
  
  if (onSearch) {
    input.addEventListener('input', (e) => onSearch(e.target.value));
  }
  searchGroup.appendChild(input);

  // Dropdown Chevron Trigger Button
  const chevronBtn = document.createElement('button');
  chevronBtn.type = 'button';
  chevronBtn.className = 'ml-1 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none';
  chevronBtn.innerHTML = `<i data-lucide="chevrons-up-down" class="w-3.5 h-3.5"></i>`;
  searchGroup.appendChild(chevronBtn);

  // 2. Plus Action Button
  const plusBtn = document.createElement('button');
  plusBtn.type = 'button';
  plusBtn.className = `
    h-9 w-9 flex items-center justify-center rounded-md border
    border-zinc-200 dark:border-zinc-800
    bg-white dark:bg-zinc-950
    text-zinc-700 dark:text-zinc-300
    hover:bg-zinc-100 dark:hover:bg-zinc-900
    hover:text-zinc-900 dark:hover:text-zinc-100
    transition-all duration-150 shadow-sm focus:outline-none shrink-0
  `.replace(/\s+/g, ' ').trim();
  plusBtn.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i>`;

  wrapper.appendChild(searchGroup);
  wrapper.appendChild(plusBtn);

  // Attach dropdown to the chevron trigger
  const dropdown = new DropdownMenu({
    trigger: chevronBtn,
    items: dropdownItems,
    align: 'start',
    width: 'w-60'
  });

  // If plus button has items, attach dropdown or click listener
  if (onPlusClick) {
    plusBtn.addEventListener('click', onPlusClick);
  } else {
    // If no custom plus click, clicking plus also triggers creation dropdown
    plusBtn.addEventListener('click', () => dropdown.toggle());
  }

  // Render Lucide icons
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    setTimeout(() => window.lucide.createIcons({ root: wrapper }), 0);
  }

  return {
    element: wrapper,
    input,
    dropdown
  };
}
