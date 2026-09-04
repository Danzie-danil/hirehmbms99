/**
 * Supabase / shadcn UI DropdownMenu Primitive for BMSTZ
 * Features:
 * - Smart edge detection & floating alignment
 * - Smooth entrance animations (zoom-in-95 fade-in)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Full Dark/Light Supabase styling with Lucide icons
 * - Click-outside dismissal
 */

let activeDropdownInstance = null;

// Global listener to close active dropdown when clicking outside
if (typeof window !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (activeDropdownInstance && !activeDropdownInstance.container.contains(e.target)) {
      activeDropdownInstance.close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeDropdownInstance) {
      activeDropdownInstance.close();
    }
  });
}

export class DropdownMenu {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.trigger The element that triggers the menu
   * @param {Array<Object>} options.items Menu items array
   * @param {'start'|'center'|'end'} [options.align='start'] Horizontal alignment
   * @param {number} [options.sideOffset=6] Offset distance from trigger
   * @param {string} [options.className=''] Extra classes for the content box
   * @param {string} [options.width='w-56'] Tailwind width class
   * @param {Function} [options.onSelect] Callback when any item is selected
   */
  constructor({
    trigger,
    items = [],
    align = 'start',
    sideOffset = 6,
    className = '',
    width = 'min-w-[13rem]',
    onSelect = null
  }) {
    this.trigger = trigger;
    this.items = items;
    this.align = align;
    this.sideOffset = sideOffset;
    this.className = className;
    this.width = width;
    this.onSelect = onSelect;
    this.isOpen = false;

    this.container = document.createElement('div');
    this.container.className = 'relative inline-block text-left';
    
    // Replace trigger in DOM with wrapped container if trigger already attached
    if (trigger.parentNode) {
      trigger.parentNode.insertBefore(this.container, trigger);
    }
    this.container.appendChild(trigger);

    this.menuElement = this.buildMenu();
    this.container.appendChild(this.menuElement);

    this.bindEvents();
  }

  buildMenu() {
    const menu = document.createElement('div');
    menu.className = `
      absolute z-[100] ${this.width} rounded-md border
      border-zinc-200 dark:border-zinc-800
      bg-white dark:bg-zinc-950
      p-1 text-zinc-800 dark:text-zinc-200
      shadow-lg dark:shadow-2xl dark:shadow-black/60
      transition-all duration-150 transform origin-top
      opacity-0 scale-95 pointer-events-none hidden
      ${this.className}
    `.replace(/\s+/g, ' ').trim();

    this.renderItems(menu);
    return menu;
  }

  renderItems(container) {
    container.innerHTML = '';
    
    this.items.forEach((item, index) => {
      if (item.type === 'separator' || item.separator) {
        const sep = document.createElement('div');
        sep.className = '-mx-1 my-1 h-px bg-zinc-200 dark:bg-zinc-800';
        container.appendChild(sep);
        return;
      }

      if (item.type === 'label' || item.label) {
        const lbl = document.createElement('div');
        lbl.className = 'px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none';
        lbl.textContent = item.text || item.label;
        container.appendChild(lbl);
        return;
      }

      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.dataset.itemIndex = index;
      
      const isDestructive = item.variant === 'destructive' || item.destructive;
      const baseColor = isDestructive
        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300'
        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100';

      itemBtn.className = `
        w-full group flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm
        font-normal text-left transition-colors duration-100
        focus:outline-none focus:bg-zinc-100 dark:focus:bg-zinc-800
        disabled:pointer-events-none disabled:opacity-40 select-none
        ${baseColor}
      `.replace(/\s+/g, ' ').trim();

      let iconHtml = '';
      if (item.icon) {
        iconHtml = `<i data-lucide="${item.icon}" class="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"></i>`;
      }

      let shortcutHtml = '';
      if (item.shortcut) {
        shortcutHtml = `<span class="ml-auto text-xs tracking-widest text-zinc-400 dark:text-zinc-500">${item.shortcut}</span>`;
      }

      let badgeHtml = '';
      if (item.badge) {
        badgeHtml = `<span class="ml-auto px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">${item.badge}</span>`;
      }

      itemBtn.innerHTML = `
        ${iconHtml}
        <span class="truncate flex-1">${item.text || item.title || ''}</span>
        ${badgeHtml}
        ${shortcutHtml}
      `;

      if (item.disabled) {
        itemBtn.disabled = true;
      }

      itemBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        if (typeof item.onClick === 'function') {
          item.onClick(e);
        }
        if (typeof this.onSelect === 'function') {
          this.onSelect(item, e);
        }
      });

      container.appendChild(itemBtn);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      setTimeout(() => window.lucide.createIcons({ root: container }), 0);
    }
  }

  bindEvents() {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Keyboard navigation within the menu
    this.menuElement.addEventListener('keydown', (e) => {
      const focusable = Array.from(this.menuElement.querySelectorAll('button:not([disabled])'));
      const activeIndex = focusable.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (activeIndex + 1) % focusable.length;
        focusable[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (activeIndex - 1 + focusable.length) % focusable.length;
        focusable[prev]?.focus();
      } else if (e.key === 'Escape') {
        this.close();
        this.trigger.focus();
      }
    });
  }

  positionMenu() {
    this.menuElement.classList.remove('left-0', 'right-0', 'left-1/2', '-translate-x-1/2');

    if (this.align === 'end') {
      this.menuElement.classList.add('right-0');
    } else if (this.align === 'center') {
      this.menuElement.classList.add('left-1/2', '-translate-x-1/2');
    } else {
      this.menuElement.classList.add('left-0');
    }

    this.menuElement.style.top = `calc(100% + ${this.sideOffset}px)`;
  }

  open() {
    if (activeDropdownInstance && activeDropdownInstance !== this) {
      activeDropdownInstance.close();
    }

    this.positionMenu();
    this.menuElement.classList.remove('hidden');

    requestAnimationFrame(() => {
      this.menuElement.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
      this.menuElement.classList.add('opacity-100', 'scale-100');
    });

    this.isOpen = true;
    activeDropdownInstance = this;

    // Focus first available item for keyboard navigation
    setTimeout(() => {
      const firstItem = this.menuElement.querySelector('button:not([disabled])');
      firstItem?.focus();
    }, 50);
  }

  close() {
    if (!this.isOpen) return;

    this.menuElement.classList.remove('opacity-100', 'scale-100');
    this.menuElement.classList.add('opacity-0', 'scale-95', 'pointer-events-none');

    setTimeout(() => {
      this.menuElement.classList.add('hidden');
    }, 150);

    this.isOpen = false;
    if (activeDropdownInstance === this) {
      activeDropdownInstance = null;
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}

/**
 * Convenient factory function to attach a dropdown menu to any selector or element
 * @example
 * attachDropdown('#my-button', {
 *   align: 'end',
 *   items: [
 *     { text: 'Create a new snippet', icon: 'file-plus', onClick: () => ... },
 *     { text: 'Create a new logs query', icon: 'file-text', onClick: () => ... },
 *     { type: 'separator' },
 *     { text: 'Create a new folder', icon: 'folder-plus', onClick: () => ... },
 *   ]
 * });
 */
export function attachDropdown(trigger, options) {
  const triggerEl = typeof trigger === 'string' ? document.querySelector(trigger) : trigger;
  if (!triggerEl) {
    console.warn(`[attachDropdown] Trigger element not found:`, trigger);
    return null;
  }
  return new DropdownMenu({ trigger: triggerEl, ...options });
}
