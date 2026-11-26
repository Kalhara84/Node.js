import $ from 'jquery';
import select2Factory from 'select2';

// Attach jQuery to global window object
(window as unknown as { $: typeof $; jQuery: typeof $ }).$ = $;
(window as unknown as { $: typeof $; jQuery: typeof $ }).jQuery = $;

// Initialize Select2 on our jQuery instance (handles Vite CJS/UMD interop)
const initPlugin = (select2Factory as unknown as { default?: (root?: unknown, jq?: unknown) => void })?.default ?? select2Factory;
if (typeof $.fn.select2 !== 'function' && typeof initPlugin === 'function') {
    (initPlugin as (root?: unknown, jq?: unknown) => void)(window, $);
}

// Focus search input immediately upon dropdown opening
$(document).on('select2:open', () => {
    const focusSearch = () => {
        const input = document.querySelector<HTMLInputElement>('.select2-container--open .select2-search__field');
        if (input) {
            input.focus();
        }
    };
    focusSearch();
    setTimeout(focusSearch, 0);
});

const observedSelects = new WeakMap<HTMLSelectElement, MutationObserver>();

/**
 * Enhance a single <select> element with Select2 and synchronization watchers.
 */
export function enhanceSelect(select: HTMLSelectElement): void {
    if (select.dataset.noSelect2 !== undefined) {
        return;
    }

    const $select = $(select);

    // If not already initialized
    if (!$select.hasClass('select2-hidden-accessible')) {
        const firstOpt = select.querySelector('option[value=""]');
        const placeholder = firstOpt?.textContent?.trim() || undefined;

        $select.select2({
            theme: 'bootstrap-5',
            width: '100%',
            placeholder,
            allowClear: false
        });

        // Bubble change and input events to native DOM
        $select.on('select2:select.payroll select2:unselect.payroll select2:clear.payroll', () => {
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    // Select2 observes disabled attributes itself; only synchronize values and options here.
    if (!observedSelects.has(select)) {

        // Wrap 'value' setter to keep Select2 display in sync with programmatic value changes
        const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        if (valueDescriptor && valueDescriptor.set) {
            Object.defineProperty(select, 'value', {
                get() {
                    return valueDescriptor.get!.call(this);
                },
                set(val: string) {
                    valueDescriptor.set!.call(this, val);
                    $select.trigger('change.select2');
                },
                configurable: true
            });
        }

        // Refresh the selected label when options change without rewriting the select.
        const observer = new MutationObserver(() => {
            $select.trigger('change.select2');
        });

        observer.observe(select, {
            childList: true
        });
        observedSelects.set(select, observer);
    }
}

/**
 * Initializes Select2 on all matching select elements inside the container.
 */
export function initSelect2(root: HTMLElement | Document = document): void {
    const selects = root.querySelectorAll<HTMLSelectElement>('select.form-select:not([data-no-select2])');
    selects.forEach((select) => enhanceSelect(select));
}

/**
 * Safely closes any open Select2 dropdowns and cleans up instances in root.
 */
export function destroySelect2(root: HTMLElement | Document = document): void {
    const selects = root.querySelectorAll<HTMLSelectElement>('select.select2-hidden-accessible');
    selects.forEach((select) => {
        observedSelects.get(select)?.disconnect();
        observedSelects.delete(select);
        Reflect.deleteProperty(select, 'value');
        $(select).off('.payroll');
        try {
            $(select).select2('destroy');
        } catch {
            // Ignore if already destroyed
        }
    });

    // Close any orphaned open dropdowns
    $('.select2-container--open').remove();
}

let pageObserver: MutationObserver | null = null;

/** Release observers and widgets when React unmounts the page. */
export function stopAutoSelect2(container: HTMLElement): void {
    pageObserver?.disconnect();
    pageObserver = null;
    destroySelect2(container);
}

/**
 * Start observing DOM changes inside a container to automatically enhance new selects.
 */
export function startAutoSelect2(container: HTMLElement): void {
    if (pageObserver) {
        pageObserver.disconnect();
    }

    // Initial enhancement
    initSelect2(container);

    pageObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as HTMLElement;
                    if (el.tagName === 'SELECT' && el.classList.contains('form-select')) {
                        enhanceSelect(el as HTMLSelectElement);
                    } else if (el.querySelectorAll) {
                        const selects = el.querySelectorAll<HTMLSelectElement>('select.form-select:not([data-no-select2])');
                        selects.forEach((sel) => enhanceSelect(sel));
                    }
                }
            }
        }
    });

    pageObserver.observe(container, {
        childList: true,
        subtree: true
    });
}
