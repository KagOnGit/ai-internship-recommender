import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
export default function SearchableSelect({ value, onChange, options, placeholder, ariaLabel, searchPlaceholder, emptyMessage }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const filtered = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) {
            return options;
        }
        return options.filter((option) => option.label.toLowerCase().includes(trimmed));
    }, [options, query]);
    useEffect(() => {
        const handleDocumentClick = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, []);
    useEffect(() => {
        if (!open) {
            setHighlightIndex(-1);
            return;
        }
        const currentIndex = filtered.findIndex((option) => option.value === value);
        setHighlightIndex(currentIndex >= 0 ? currentIndex : filtered.length > 0 ? 0 : -1);
    }, [filtered, open, value]);
    useEffect(() => {
        if (highlightIndex < 0 || !listRef.current) {
            return;
        }
        const optionNode = listRef.current.children.item(highlightIndex);
        if (!optionNode) {
            return;
        }
        const optionTop = optionNode.offsetTop;
        const optionBottom = optionTop + optionNode.offsetHeight;
        const listScrollTop = listRef.current.scrollTop;
        const listHeight = listRef.current.clientHeight;
        if (optionTop < listScrollTop) {
            listRef.current.scrollTop = optionTop;
        }
        else if (optionBottom > listScrollTop + listHeight) {
            listRef.current.scrollTop = optionBottom - listHeight;
        }
    }, [highlightIndex]);
    const currentLabel = useMemo(() => {
        const match = options.find((option) => option.value === value);
        return match ? match.label : '';
    }, [options, value]);
    const handleSelect = (option) => {
        onChange(option.value);
        setOpen(false);
        setQuery('');
    };
    const handleRootKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            setHighlightIndex((prev) => {
                if (filtered.length === 0) {
                    return -1;
                }
                const next = prev + 1;
                return next >= filtered.length ? 0 : next;
            });
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            setHighlightIndex((prev) => {
                if (filtered.length === 0) {
                    return -1;
                }
                const next = prev - 1;
                return next < 0 ? filtered.length - 1 : next;
            });
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            if (highlightIndex >= 0 && filtered[highlightIndex]) {
                handleSelect(filtered[highlightIndex]);
            }
        }
        else if (event.key === 'Escape') {
            if (open) {
                event.preventDefault();
                setOpen(false);
                setQuery('');
            }
        }
        else if (event.key === ' ') {
            if (!open) {
                event.preventDefault();
                setOpen(true);
            }
        }
    };
    return (_jsxs("div", { ref: rootRef, style: { position: 'relative' }, children: [_jsx("div", { role: "combobox", "aria-expanded": open, "aria-label": ariaLabel, tabIndex: 0, onClick: () => setOpen((prev) => !prev), onKeyDown: handleRootKeyDown, style: {
                    width: '100%',
                    padding: '12px',
                    fontSize: 16,
                    borderRadius: '12px',
                    border: '1px solid #d1d5db',
                    background: '#f3f4f6',
                    cursor: 'pointer'
                }, children: _jsx("span", { style: { color: currentLabel ? '#111827' : '#9CA3AF' }, children: currentLabel || placeholder || '' }) }), open && (_jsxs("div", { style: {
                    position: 'absolute',
                    zIndex: 20,
                    left: 0,
                    right: 0,
                    top: 'calc(100% + 4px)',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
                }, children: [_jsx("input", { autoFocus: true, value: query, onChange: (event) => setQuery(event.target.value), placeholder: searchPlaceholder, style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            borderBottom: '1px solid #f3f4f6',
                            outline: 'none'
                        }, onKeyDown: (event) => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                setHighlightIndex((prev) => {
                                    if (filtered.length === 0) {
                                        return -1;
                                    }
                                    const next = prev + 1;
                                    return next >= filtered.length ? 0 : next;
                                });
                            }
                            else if (event.key === 'ArrowUp') {
                                event.preventDefault();
                                setHighlightIndex((prev) => {
                                    if (filtered.length === 0) {
                                        return -1;
                                    }
                                    const next = prev - 1;
                                    return next < 0 ? filtered.length - 1 : next;
                                });
                            }
                            else if (event.key === 'Enter') {
                                event.preventDefault();
                                if (highlightIndex >= 0 && filtered[highlightIndex]) {
                                    handleSelect(filtered[highlightIndex]);
                                }
                            }
                        } }), _jsxs("div", { ref: listRef, style: { maxHeight: 220, overflowY: 'auto' }, children: [filtered.map((option, index) => (_jsx("div", { onClick: () => handleSelect(option), style: {
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    background: index === highlightIndex ? '#eff6ff' : 'transparent'
                                }, onMouseEnter: () => setHighlightIndex(index), children: option.label }, option.value))), filtered.length === 0 && (_jsx("div", { style: { padding: '10px 12px', color: '#6b7280' }, children: emptyMessage || 'No matches' }))] })] }))] }));
}
