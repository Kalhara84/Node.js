import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, InputHTMLAttributes } from 'react';

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

// Check the format and reject dates such as February 30.
function isDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) === 0) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Validate typed dates using the same limits as the calendar.
function dateError(value: string, min?: string | number, max?: string | number): string {
    if (!value) {
        return '';
    }
    if (!isDate(value)) {
        return 'Enter a valid date as YYYY-MM-DD.';
    }
    if (min && value < String(min)) {
        return `Date must be on or after ${min}.`;
    }
    if (max && value > String(max)) {
        return `Date must be on or before ${max}.`;
    }
    return '';
}

// Date field with YYYY-MM-DD text and a calendar picker.
export default function DateInput({ className, value, defaultValue, onChange, min, max, disabled, readOnly, ...props }: DateInputProps) {
    const [localValue, setLocalValue] = useState(String(defaultValue ?? ''));
    const text = String(value ?? localValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLInputElement>(null);

    const validDate = isDate(text);
    const message = dateError(text, min, max);

    useEffect(() => {
        inputRef.current?.setCustomValidity(message);
    }, [message]);

    // Keep typed and selected dates in sync with the parent form.
    function onDateChange(e: ChangeEvent<HTMLInputElement>): void {
        setLocalValue(e.target.value);
        onChange?.(e);
    }

    function openCalendar(): void {
        try {
            pickerRef.current?.showPicker?.();
        } catch {
            // Browsers that block showPicker still allow the native calendar control.
        }
    }

    return (
        <div className="iso-date-input">
            <input
                {...props}
                ref={inputRef}
                className={className ? `form-control ${className}` : 'form-control'}
                type="text"
                value={text}
                placeholder="YYYY-MM-DD"
                pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                maxLength={10}
                disabled={disabled}
                readOnly={readOnly}
                onChange={onDateChange}
            />
            <span className="iso-date-picker">
                <i className="bi bi-calendar-event" aria-hidden="true" />
                <input
                    ref={pickerRef}
                    type="date"
                    aria-label={`Choose date${props.name ? ` for ${props.name}` : ''}`}
                    value={validDate ? text : ''}
                    min={min}
                    max={max}
                    disabled={disabled || readOnly}
                    onClick={openCalendar}
                    onChange={onDateChange}
                />
            </span>
        </div>
    );
}
