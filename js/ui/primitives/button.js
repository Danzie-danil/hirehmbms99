/**
 * Supabase / shadcn UI Button Primitive for BMSTZ
 * Generates styled, accessible button elements with variant support.
 */

export const buttonVariants = {
  variants: {
    default: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500",
    outline: "border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 active:bg-zinc-200 dark:active:bg-zinc-800 shadow-sm",
    secondary: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600",
    ghost: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
    destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500",
    subtle: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60"
  },
  sizes: {
    default: "h-9 px-4 py-2 text-sm",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-6 text-base",
    icon: "h-9 w-9 p-0 flex items-center justify-center",
    "icon-sm": "h-8 w-8 p-0 flex items-center justify-center text-xs"
  },
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer"
};

/**
 * Creates a styled Button element
 * @param {Object} options
 * @param {string} [options.variant='default']
 * @param {string} [options.size='default']
 * @param {string} [options.className='']
 * @param {string} [options.text='']
 * @param {string} [options.icon=''] Lucide icon name or HTML
 * @param {Function} [options.onClick]
 * @returns {HTMLButtonElement}
 */
export function createButton({
  variant = 'default',
  size = 'default',
  className = '',
  text = '',
  icon = '',
  onClick = null,
  attributes = {}
} = {}) {
  const btn = document.createElement('button');
  const variantClass = buttonVariants.variants[variant] || buttonVariants.variants.default;
  const sizeClass = buttonVariants.sizes[size] || buttonVariants.sizes.default;

  btn.className = `${buttonVariants.base} ${variantClass} ${sizeClass} ${className}`.trim();

  let innerHTML = '';
  if (icon) {
    innerHTML += `<i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>`;
  }
  if (text) {
    innerHTML += `<span>${text}</span>`;
  }
  btn.innerHTML = innerHTML;

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  for (const [key, val] of Object.entries(attributes)) {
    btn.setAttribute(key, val);
  }

  // Auto-render Lucide icons if available
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    setTimeout(() => window.lucide.createIcons({ root: btn }), 0);
  }

  return btn;
}
