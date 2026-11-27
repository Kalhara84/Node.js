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

/**
 * Enhance a single <select> element with Select2.
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

        // Bubble change and input events to native DOM (React listens to these)
        $select.on('select2:select.payroll select2:unselect.payroll select2:clear.payroll', () => {
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
}

/**
 * Refresh the Select2 display after React changed the value or the options.
 */
export function refreshSelect2(select: HTMLSelectElement): void {
    if ($(select).hasClass('select2-hidden-accessible')) {
        $(select).trigger('change.select2');
    }
}

/**
 * Safely closes any open Select2 dropdown and removes the Select2 instance of one select.
 */
export function destroySelect2(select: HTMLSelectElement): void {
    $(select).off('.payroll');
    try {
        $(select).select2('destroy');
    } catch {
        // Ignore if already destroyed
    }

    // Close any orphaned open dropdowns
    $('.select2-container--open').remove();
}
