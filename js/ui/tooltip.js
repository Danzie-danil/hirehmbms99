// ─────────────────────────────────────────────────────────────────────────────
// BMS Ultra-Premium Global Tooltip Engine
// File: js/ui/tooltip.js
// Description: Universal, hardware-accelerated, glassmorphic hover tooltips that
//              intercept native title attributes and custom data-tooltips across
//              the entire application.
// ─────────────────────────────────────────────────────────────────────────────

let tooltipElem = null;
let currentTarget = null;
let showTimeout = null;
let hideTimeout = null;
let isHoveringTooltip = false;
let isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

export function initPremiumTooltips() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Detect touch dynamically
    window.addEventListener('touchstart', () => { isTouchDevice = true; }, { passive: true });
    window.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') isTouchDevice = true;
    }, { passive: true });

    // Create singleton element if not present
    createTooltipElement();

    // Global Delegated Listeners
    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseout', handleMouseOut, { passive: true });
    document.addEventListener('focusin', handleFocusIn, { passive: true });
    document.addEventListener('focusout', handleFocusOut, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('scroll', () => hideTooltip(true), { passive: true });
    window.addEventListener('resize', () => {
        if (window.innerWidth < 1024) isTouchDevice = true;
        hideTooltip(true);
    }, { passive: true });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideTooltip(true);
    });

    // Strip/intercept native titles on DOM mutations
    observeDomForTitles();
}

function handleClick(e) {
    // Suppress tooltip popups on clicks and mobile touch taps
    hideTooltip(true);
}

function createTooltipElement() {
    if (document.getElementById('bms-premium-tooltip')) {
        tooltipElem = document.getElementById('bms-premium-tooltip');
        return;
    }

    tooltipElem = document.createElement('div');
    tooltipElem.id = 'bms-premium-tooltip';
    tooltipElem.className = 'bms-tooltip-container';
    tooltipElem.setAttribute('role', 'tooltip');
    tooltipElem.setAttribute('aria-hidden', 'true');

    tooltipElem.innerHTML = `
        <div class="bms-tooltip-arrow"></div>
        <div class="bms-tooltip-inner">
            <div id="bms-tooltip-header" class="bms-tooltip-header hidden"></div>
            <div id="bms-tooltip-body" class="bms-tooltip-body"></div>
            <div id="bms-tooltip-shortcut" class="bms-tooltip-shortcut hidden"></div>
        </div>
    `;

    document.body.appendChild(tooltipElem);
}

function getTooltipTarget(target) {
    if (!target || target === document || target === document.body) return null;
    const elem = target.closest('[data-tooltip], [data-tip], [title], [data-bms-tooltip]');
    if (!elem) return null;

    if (elem.hasAttribute('data-no-tooltip') || elem.getAttribute('data-no-tooltip') === 'true') {
        elem.removeAttribute('title');
        return null;
    }

    // If native title exists, intercept and migrate to data-bms-tooltip to suppress native OS tooltip
    if (elem.hasAttribute('title')) {
        const titleVal = elem.getAttribute('title');
        if (titleVal && titleVal.trim()) {
            elem.setAttribute('data-bms-tooltip', titleVal);
        }
        elem.removeAttribute('title');
    }

    return elem;
}

function handleMouseOver(e) {
    if (isTouchDevice) return;
    const target = getTooltipTarget(e.target);
    if (!target) return;

    if (target === currentTarget) return;

    clearTimeout(hideTimeout);
    clearTimeout(showTimeout);

    // Fast snappy delay for high responsiveness (80ms if already hovering another, else 120ms)
    const delay = tooltipElem && tooltipElem.classList.contains('bms-tooltip-visible') ? 40 : 110;

    showTimeout = setTimeout(() => {
        showTooltipForElement(target);
    }, delay);
}

function handleMouseOut(e) {
    if (isTouchDevice) return;
    const target = getTooltipTarget(e.target);
    if (!target && !currentTarget) return;

    clearTimeout(showTimeout);
    clearTimeout(hideTimeout);

    hideTimeout = setTimeout(() => {
        hideTooltip();
    }, 60);
}

function handleFocusIn(e) {
    const target = getTooltipTarget(e.target);
    if (target) {
        clearTimeout(hideTimeout);
        showTooltipForElement(target);
    }
}

function handleFocusOut(e) {
    hideTooltip(true);
}

function showTooltipForElement(target) {
    if (!target || !document.body.contains(target)) return;

    const text = target.getAttribute('data-tooltip') || 
                 target.getAttribute('data-tip') || 
                 target.getAttribute('data-bms-tooltip');

    if (!text || !text.trim()) {
        hideTooltip(true);
        return;
    }

    currentTarget = target;
    createTooltipElement();

    const title = target.getAttribute('data-tooltip-title') || '';
    const shortcut = target.getAttribute('data-tooltip-shortcut') || target.getAttribute('data-shortcut') || '';
    const position = target.getAttribute('data-tooltip-position') || target.getAttribute('data-tip-pos') || 'top';
    const variant = target.getAttribute('data-tooltip-variant') || 'default'; // 'default', 'indigo', 'emerald', 'amber', 'rose'

    renderTooltipContent({ text, title, shortcut, variant });
    positionTooltip(target, position);

    tooltipElem.classList.add('bms-tooltip-visible');
    tooltipElem.setAttribute('aria-hidden', 'false');
}

function renderTooltipContent({ text, title, shortcut, variant }) {
    const headerEl = tooltipElem.querySelector('#bms-tooltip-header');
    const bodyEl = tooltipElem.querySelector('#bms-tooltip-body');
    const shortcutEl = tooltipElem.querySelector('#bms-tooltip-shortcut');

    // Title
    if (title && title.trim()) {
        headerEl.textContent = title;
        headerEl.classList.remove('hidden');
    } else {
        headerEl.classList.add('hidden');
        headerEl.textContent = '';
    }

    // Body (supports simple formatted text & bold)
    bodyEl.innerHTML = formatTooltipText(text);

    // Shortcut KBD
    if (shortcut && shortcut.trim()) {
        shortcutEl.innerHTML = formatShortcut(shortcut);
        shortcutEl.classList.remove('hidden');
    } else {
        shortcutEl.classList.add('hidden');
        shortcutEl.textContent = '';
    }

    // Color variant attributes
    tooltipElem.setAttribute('data-variant', variant);
}

function formatTooltipText(raw) {
    if (!raw) return '';
    // Escape HTML first
    let escaped = String(raw)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Parse bold syntax **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Parse newlines
    escaped = escaped.replace(/\n/g, '<br/>');

    return escaped;
}

function formatShortcut(shortcut) {
    const keys = shortcut.split('+').map(k => k.trim());
    return keys.map(k => `<kbd class="bms-tooltip-kbd">${k}</kbd>`).join('<span class="bms-tooltip-kbd-plus">+</span>');
}

function positionTooltip(target, preferredPosition = 'top') {
    if (!tooltipElem || !target) return;

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltipElem.getBoundingClientRect();
    const arrow = tooltipElem.querySelector('.bms-tooltip-arrow');

    const gap = 8; // distance from element
    const padding = 10; // minimum distance from viewport edge
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let pos = preferredPosition.toLowerCase();

    // Auto flip if overflowing boundaries
    if (pos === 'top' && targetRect.top - tooltipRect.height - gap < padding) {
        pos = 'bottom';
    } else if (pos === 'bottom' && targetRect.bottom + tooltipRect.height + gap > viewportHeight - padding) {
        pos = 'top';
    } else if (pos === 'left' && targetRect.left - tooltipRect.width - gap < padding) {
        pos = 'right';
    } else if (pos === 'right' && targetRect.right + tooltipRect.width + gap > viewportWidth - padding) {
        pos = 'left';
    }

    let top = 0;
    let left = 0;
    let arrowLeft = '50%';
    let arrowTop = '50%';

    if (pos === 'top') {
        top = targetRect.top - tooltipRect.height - gap;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    } else if (pos === 'bottom') {
        top = targetRect.bottom + gap;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    } else if (pos === 'left') {
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left - tooltipRect.width - gap;
    } else if (pos === 'right') {
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.right + gap;
    }

    // Constrain horizontal
    if (left < padding) {
        const diff = padding - left;
        left = padding;
        if (pos === 'top' || pos === 'bottom') {
            arrowLeft = `calc(50% - ${diff}px)`;
        }
    } else if (left + tooltipRect.width > viewportWidth - padding) {
        const diff = (left + tooltipRect.width) - (viewportWidth - padding);
        left = viewportWidth - tooltipRect.width - padding;
        if (pos === 'top' || pos === 'bottom') {
            arrowLeft = `calc(50% + ${diff}px)`;
        }
    }

    // Constrain vertical
    if (top < padding) {
        top = padding;
    } else if (top + tooltipRect.height > viewportHeight - padding) {
        top = viewportHeight - tooltipRect.height - padding;
    }

    tooltipElem.setAttribute('data-position', pos);
    tooltipElem.style.top = `${Math.round(top)}px`;
    tooltipElem.style.left = `${Math.round(left)}px`;

    if (arrow) {
        arrow.style.left = pos === 'top' || pos === 'bottom' ? arrowLeft : '';
        arrow.style.top = pos === 'left' || pos === 'right' ? arrowTop : '';
    }
}

export function hideTooltip(immediate = false) {
    clearTimeout(showTimeout);
    clearTimeout(hideTimeout);

    if (!tooltipElem) return;

    if (immediate) {
        tooltipElem.classList.remove('bms-tooltip-visible');
        tooltipElem.setAttribute('aria-hidden', 'true');
        currentTarget = null;
    } else {
        tooltipElem.classList.remove('bms-tooltip-visible');
        tooltipElem.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            if (!tooltipElem.classList.contains('bms-tooltip-visible')) {
                currentTarget = null;
            }
        }, 150);
    }
}

export function showTooltip(element, text, position = 'top') {
    if (!element) return;
    element.setAttribute('data-bms-tooltip', text);
    if (position) element.setAttribute('data-tooltip-position', position);
    showTooltipForElement(element);
}

function observeDomForTitles() {
    if (typeof MutationObserver === 'undefined') return;

    const sanitizeElement = (elem) => {
        if (elem.nodeType === Node.ELEMENT_NODE) {
            if (elem.hasAttribute('title')) {
                const titleVal = elem.getAttribute('title');
                if (titleVal && titleVal.trim()) {
                    elem.setAttribute('data-bms-tooltip', titleVal);
                }
                elem.removeAttribute('title');
            }
            const children = elem.querySelectorAll('[title]');
            children.forEach(c => {
                const val = c.getAttribute('title');
                if (val && val.trim()) {
                    c.setAttribute('data-bms-tooltip', val);
                }
                c.removeAttribute('title');
            });
        }
    };

    // Sanitize initial DOM
    document.querySelectorAll('[title]').forEach(el => {
        const val = el.getAttribute('title');
        if (val && val.trim()) {
            el.setAttribute('data-bms-tooltip', val);
        }
        el.removeAttribute('title');
    });

    const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
            if (mut.type === 'childList') {
                mut.addedNodes.forEach(node => sanitizeElement(node));
            } else if (mut.type === 'attributes' && mut.attributeName === 'title') {
                sanitizeElement(mut.target);
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['title']
    });
}

// Global initialization & Window binding
window.initPremiumTooltips = initPremiumTooltips;
window.showTooltip = showTooltip;
window.hideTooltip = hideTooltip;

// Auto-run on script execution if DOM ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPremiumTooltips);
    } else {
        initPremiumTooltips();
    }
}
