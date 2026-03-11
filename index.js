/**
 * index.js - Punto de entrada del Editor
 * Componente Mithril que importa desde editor-core y editor-features
 */

import './editor-features.js';

// Importar desde editor-core
import {
    ICONS,
    TOOLBAR_COMMANDS,
    DEFAULT_TOOLBAR_COMMAND,
    DEFAULT_LANG,
    SUPPORTED_LANGS,
    STYLE_ELEMENT_ID,
    $,
    btn,
    hide,
    show,
    createToolbar,
    sanitizeUrl,
    basicSanitize,
    sanitizeHtml,
    normalizeHtml,
    formatHTML,
    saveSelection,
    restoreSelection,
    configureExecCommandDefaults,
    getNormalizedFormatBlockValue,
    isSelectionInsideTag,
    isCommandExplicitlyApplied,
    getCleanOutput,
    getRawExternalValue,
    normalizeToTranslations,
    getTextForLang,
    getExternalValue,
    emitChange,
    emitSourceChange,
    updateActiveState,
    applyFormatBlock,
    isCursorAtEndOfInlineFormat
} from './editor-core.js';

// Importar desde editor-features
import {
    // Tooltip
    createTooltip,
    showTooltip,
    hideTooltip,
    setupTooltip,
    // Links
    createPopover,
    showPopover,
    hidePopover,
    handleLinkClick,
    setupPopoverViewHandlers,
    setupPopoverEditHandlers,
    applyLink,
    // Images
    createImageOverlay,
    createImageToolbar,
    showImageToolbar,
    hideImageToolbar,
    updateImageToolbarActiveState,
    applyImageAlignment,
    setupImageToolbarHandlers,
    selectImage,
    deselectImage,
    updateImageOverlayPosition,
    setupImageResizeHandlers,
    handleImageClick,
    registerBlobUrl,
    revokeBlobUrl,
    cleanupUnusedBlobUrls,
    cleanupAllBlobUrls,
    createImageFileInput,
    insertImageContent,
    applyImage,
    // Tables
    applyTable,
    createTableToolbar,
    showTableToolbar,
    hideTableToolbar,
    getCellPosition,
    setSelectionToCell,
    insertRowAbove,
    insertRowBelow,
    insertColLeft,
    insertColRight,
    deleteRow,
    deleteCol,
    deleteTable,
    setupTableToolbarHandlers,
    handleTableCellClick,
    handleTableKeyboardNavigation,
    // Slash Commands
    hasImageFiles,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    createSlashMenu,
    getFilteredSlashCommands,
    renderSlashMenu,
    showSlashMenu,
    hideSlashMenu,
    applySlashCommand,
    isCursorAtStartOfLine,
    getSlashCommandQuery,
    handleSlashCommandKeydown,
    // Drag & Drop
    handleDrop
} from './editor-features.js';

// ============================================
// FUNCIONES LOCALES DEL COMPONENTE
// ============================================

function ensureInlineStyles() {
    if (typeof document === 'undefined') {
        return;
    }

    if (document.getElementById(STYLE_ELEMENT_ID)) {
        return;
    }

    const link = document.createElement('link');
    link.id = STYLE_ELEMENT_ID;
    link.rel = 'stylesheet';
    link.href = './editor.css';
    document.head.appendChild(link);
}

function createActiveState() {
    return TOOLBAR_COMMANDS.reduce((acc, item) => {
        acc[item.id] = false;
        return acc;
    }, {});
}

// Las siguientes funciones vienen importadas desde editor-core.js:
// - emitChange
// - emitSourceChange
// - updateActiveState
// - applyFormatBlock
// - isCursorAtEndOfInlineFormat

function applyCommand(vnode, command) {
    const { state } = vnode;
    if (!state.editorEl) return;

    configureExecCommandDefaults();

    if (command === 'link') {
        const selection = window.getSelection();
        if (selection.rangeCount && !selection.isCollapsed) {
            // Hay selección de texto, mostrar popover para crear enlace
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showPopover(rect.left + rect.width / 2, rect.bottom, '', 'edit', null);
            setupPopoverEditHandlers(vnode);
        }
        return;
    }

    if (command === 'image') {
        // Abrir selector de archivos
        const input = createImageFileInput(vnode);
        input.click();
        return;
    }

    if (command === 'table') {
        applyTable(vnode);
        return;
    }

    if (command === 'source') {
        toggleSourceView(vnode);
        return;
    }

    if (command === 'formatBlock') {
        // Ya manejado por applyFormatBlock
        return;
    }

    if (command.id && state.editorEl) {
        state.editorEl.focus();
        document.execCommand(command.id, false, null);
        updateActiveState(state);
        emitChange(vnode);
    }
}

// activateInlineInput viene de editor-features.js

function activateInlineInput(vnode, mode) {
    const { state } = vnode;
    if (!state.editorEl) {
        return;
    }
    saveSelection(state);
    state.inlineInputMode = mode;
    state.inlineInputValue = '';
    m.redraw();

    setTimeout(() => {
        const inputEl = document.querySelector('.native-rich-editor__inline-input');
        if (inputEl) {
            inputEl.focus();
            inputEl.select();
        }
    }, 0);
}

function confirmInlineInput(vnode) {
    const { state } = vnode;
    if (!state.editorEl || !state.inlineInputMode) {
        return;
    }

    const value = state.inlineInputValue.trim();

    if (value && state.inlineInputMode === 'link') {
        const validUrl = sanitizeUrl(value, 'link');
        if (validUrl) {
            document.execCommand('createLink', false, validUrl);
        }
    }

    state.inlineInputMode = null;
    state.inlineInputValue = '';
    m.redraw();

    setTimeout(() => {
        updateActiveState(state);
        m.redraw();
    }, 0);
    emitChange(vnode);
}

function cancelInlineInput(vnode) {
    const { state } = vnode;
    state.inlineInputMode = null;
    state.inlineInputValue = '';
    m.redraw();
    restoreSelection(state);
}

// updateActiveState viene de editor-core.js

function toggleSourceView(vnode) {
    const { state } = vnode;
    state.isSourceView = !state.isSourceView;

    hidePopover();
    deselectImage();
    hideTableToolbar(vnode);

    if (state.isSourceView) {
        const html = state.editorEl ? state.editorEl.innerHTML : state.lastEmittedValue;
        const sanitized = sanitizeHtml(vnode, html);
        const normalized = normalizeHtml(sanitized);
        const formatted = formatHTML(normalized);
        state.sourceValue = formatted;
        if (state.sourceEl) {
            state.sourceEl.value = formatted;
        }
        updateActiveState(state);
        return;
    }

    const rawSource = state.sourceValue || '';
    const unformatted = rawSource.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const sanitized = sanitizeHtml(vnode, unformatted);
    const normalized = normalizeHtml(sanitized);
    if (state.editorEl && normalized !== normalizeHtml(state.editorEl.innerHTML)) {
        state.editorEl.innerHTML = normalized;
    }

    updateActiveState(state);
    emitChange(vnode);
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const NativeRichEditor = {
    oninit: (vnode) => {
        ensureInlineStyles();
        const attrs = vnode.attrs || {};
        const { isMulti, translations } = normalizeToTranslations(getRawExternalValue(attrs));

        vnode.state.currentLang = DEFAULT_LANG;
        vnode.state.isMultiLang = isMulti;

        const initialValue = getTextForLang(translations, vnode.state.currentLang);
        vnode.state.lastExternalValue = initialValue;
        vnode.state.lastEmittedValue = initialValue;
        vnode.state.isFocused = false;
        vnode.state.isSourceFocused = false;
        vnode.state.isSourceView = false;
        vnode.state.editorEl = null;
        vnode.state.sourceEl = null;
        vnode.state.sourceValue = '';
        vnode.state.savedSelection = null;
        vnode.state.pendingLinkSelection = null;
        vnode.state.pendingImageSelection = null;
        vnode.state.active = createActiveState();
        vnode.state.inlineInputMode = null;
        vnode.state.inlineInputValue = '';
    },

    onremove: (vnode) => {
        vnode.state.pendingLinkSelection = null;
        vnode.state.pendingImageSelection = null;
        hidePopover();
        hideSlashMenu();
        if (slashMenuElement && slashMenuElement.parentNode) {
            slashMenuElement.parentNode.removeChild(slashMenuElement);
            slashMenuElement = null;
        }

        if (vnode.state._cleanupOverlay) {
            vnode.state._cleanupOverlay();
        }
        if (vnode.state._selectionChangeCleanup) {
            vnode.state._selectionChangeCleanup();
        }
        deselectImage();
        if (imageOverlayElement && imageOverlayElement.parentNode) {
            imageOverlayElement.parentNode.removeChild(imageOverlayElement);
            imageOverlayElement = null;
        }

        if (imageToolbarElement && imageToolbarElement.parentNode) {
            imageToolbarElement.parentNode.removeChild(imageToolbarElement);
            imageToolbarElement = null;
        }

        hideTableToolbar(vnode);
        if (tableToolbarElement && tableToolbarElement.parentNode) {
            tableToolbarElement.parentNode.removeChild(tableToolbarElement);
            tableToolbarElement = null;
        }

        cleanupAllBlobUrls(vnode);

        if (imageFileInput && imageFileInput.parentNode) {
            imageFileInput.parentNode.removeChild(imageFileInput);
            imageFileInput = null;
        }
    },

    onupdate: (vnode) => {
        const externalValue = getExternalValue(vnode);
        const { editorEl, isFocused } = vnode.state;

        if (externalValue === vnode.state.lastExternalValue) {
            return;
        }

        vnode.state.lastExternalValue = externalValue;

        const sanitizedExternal = sanitizeHtml(vnode, externalValue);
        const normalizedExternal = normalizeHtml(sanitizedExternal);

        if (vnode.state.isSourceView) {
            const sourceEl = vnode.state.sourceEl;
            const currentSource = sourceEl ? sourceEl.value : vnode.state.sourceValue || '';
            const normalizedSource = normalizeHtml(sanitizeHtml(vnode, currentSource));
            const sizeDiff = Math.abs(normalizedExternal.length - normalizedSource.length);
            const isDrastic = !vnode.state.isSourceFocused || sizeDiff > 80;

            if (isDrastic && normalizedExternal !== normalizedSource) {
                vnode.state.sourceValue = normalizedExternal;
                if (sourceEl) {
                    sourceEl.value = normalizedExternal;
                }
            }
            return;
        }

        if (!editorEl) {
            return;
        }

        const normalizedDom = normalizeHtml(editorEl.innerHTML);
        const sizeDiff = Math.abs(normalizedExternal.length - normalizedDom.length);
        const isDrastic = !isFocused || sizeDiff > 80;

        if (isDrastic && normalizedExternal !== normalizedDom) {
            editorEl.innerHTML = normalizedExternal;
        }
    },

    view: (vnode) => {
        const placeholder = vnode.attrs.placeholder || 'Escribe aqui...';
        const toolbarLabel = vnode.attrs.toolbarLabel || 'Editor';
        const isSourceView = vnode.state.isSourceView;
        const currentLang = vnode.state.currentLang || DEFAULT_LANG;
        const isMultiLang = !!vnode.state.isMultiLang;
        const attrsForLangIndicators = vnode.attrs || {};

        const supported_toolbar_commands = vnode.attrs.supported_toolbar_commands || DEFAULT_TOOLBAR_COMMAND;
        const supported_langs = vnode.attrs.supported_langs || SUPPORTED_LANGS;

        const rawForIndicators = getRawExternalValue(attrsForLangIndicators);
        const hasTranslationForLang = (lang) => {
            if (rawForIndicators == null || typeof rawForIndicators !== 'object') {
                return false;
            }
            const normalized = normalizeToTranslations(rawForIndicators);
            const v = normalized?.translations?.[lang];
            return typeof v === 'string' && v.trim() !== '';
        };
        const filledLangCount = SUPPORTED_LANGS.filter(hasTranslationForLang).length;
        const disableCollapseToString = isMultiLang && filledLangCount > 1;

        const syncSelectionState = () => {
            saveSelection(vnode.state);
            updateActiveState(vnode.state);
        };
        const handleInput = () => {
            syncSelectionState();
            emitChange(vnode);
        };
        const handleSourceInput = () => {
            emitSourceChange(vnode);
        };

        const { inlineInputMode, inlineInputValue } = vnode.state;
        const showInlineInput = false;

        return m('div', {
            style: "width: 100%",
            class: `native-rich-editor${isSourceView ? ' native-rich-editor--source' : ''}`
        }, [
            m('div', {
                class: 'native-rich-editor__toolbar',
                role: 'toolbar',
                'aria-label': `${toolbarLabel} toolbar`
            }, showInlineInput ? [
                m('input', {
                    class: 'native-rich-editor__inline-input',
                    type: 'text',
                    placeholder: inlineInputMode === 'link' ? 'URL del enlace' : 'URL de la imagen',
                    value: inlineInputValue,
                    oncreate: (inputVnode) => {
                        inputVnode.dom.focus();
                        inputVnode.dom.select();
                    },
                    oninput: (event) => {
                        vnode.state.inlineInputValue = event.target.value;
                    },
                    onkeydown: (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            confirmInlineInput(vnode);
                        } else if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelInlineInput(vnode);
                        }
                    }
                }),
                m('button', {
                    type: 'button',
                    class: 'native-rich-editor__button native-rich-editor__button--confirm',
                    title: 'Confirmar',
                    onclick: () => confirmInlineInput(vnode)
                }, m.trust(ICONS.check)),
                m('button', {
                    type: 'button',
                    class: 'native-rich-editor__button native-rich-editor__button--cancel',
                    title: 'Cancelar',
                    onclick: () => cancelInlineInput(vnode)
                }, m.trust(ICONS.close))
            ] : (() => {
                const buttons = [];
                const isMultiLangActive = isMultiLang && disableCollapseToString;
                const activeLang = vnode.state.currentLang || DEFAULT_LANG;

                if (isMultiLangActive) {
                    buttons.push(
                        m('div', {
                            class: 'native-rich-editor__button-label',
                            style: 'margin-right: 0.5rem; font-weight: 500; font-size: 0.85rem;'
                        }, activeLang.toUpperCase())
                    );
                }

                const filteredCommands = TOOLBAR_COMMANDS.filter(cmd => supported_toolbar_commands.includes(cmd.id));

                filteredCommands.forEach(cmd => {
                    const isActive = vnode.state.active && vnode.state.active[cmd.id];
                    const buttonClass = `native-rich-editor__button${isActive ? ' is-active' : ''}`;

                    let title = cmd.title || cmd.id;
                    if (cmd.shortcut) {
                        title += ` (${cmd.shortcut})`;
                    }

                    buttons.push(
                        m('button', {
                            type: 'button',
                            class: buttonClass,
                            title: title,
                            'data-command': cmd.id,
                            onclick: (e) => {
                                e.preventDefault();
                                applyCommand(vnode, cmd);
                            }
                        }, m.trust(ICONS[cmd.icon]))
                    );
                });

                if (isMultiLangActive) {
                    SUPPORTED_LANGS.forEach(lang => {
                        const hasTranslation = hasTranslationForLang(lang);
                        const isCurrentLang = lang === currentLang;

                        buttons.push(
                            m('button', {
                                type: 'button',
                                class: `native-rich-editor__button native-rich-editor__button--lang${isCurrentLang ? ' is-active' : ''}${hasTranslation ? ' has-translation' : ''}`,
                                title: `${lang.toUpperCase()}${hasTranslation ? ' (traducido)' : ''}`,
                                onclick: (e) => {
                                    e.preventDefault();
                                    const rawExternal = getRawExternalValue(vnode.attrs);
                                    const { translations } = normalizeToTranslations(rawExternal);
                                    const newValue = getTextForLang(translations, lang);

                                    vnode.state.currentLang = lang;
                                    vnode.state.lastExternalValue = newValue;
                                    vnode.state.lastEmittedValue = newValue;

                                    if (vnode.state.editorEl) {
                                        vnode.state.editorEl.innerHTML = newValue;
                                    }

                                    m.redraw();
                                }
                            }, [
                                m('span', { class: 'native-rich-editor__button-icon' }, lang.toUpperCase())
                            ])
                        );
                    });
                }

                if (!isMultiLang || disableCollapseToString) {
                    if (vnode.attrs.value && typeof vnode.attrs.value === 'object' && vnode.attrs.valueToggle) {
                        const toggleValue = vnode.attrs.valueToggle;
                        buttons.push(
                            m('button', {
                                type: 'button',
                                class: 'native-rich-editor__button',
                                title: 'Cambiar a modo texto',
                                onclick: (e) => {
                                    e.preventDefault();
                                    if (vnode.attrs.onchange) {
                                        const currentRaw = getRawExternalValue(vnode.attrs);
                                        if (typeof currentRaw === 'object') {
                                            vnode.attrs.onchange(toggleValue);
                                        }
                                    }
                                }
                            }, m.trust(ICONS.list))
                        );
                    }
                }

                return buttons;
            })()
        ),

            isSourceView ? m('textarea', {
                class: 'native-rich-editor__source',
                value: vnode.state.sourceValue,
                oninput: (event) => {
                    vnode.state.sourceValue = event.target.value;
                    handleSourceInput();
                },
                onfocus: () => {
                    vnode.state.isSourceFocused = true;
                },
                onblur: () => {
                    vnode.state.isSourceFocused = false;
                },
                oncreate: (vnode2) => {
                    vnode.state.sourceEl = vnode2.dom;
                }
            }) : m('div', {
                class: 'native-rich-editor__surface',
                oncreate: (vnode2) => {
                    vnode.state.editorEl = vnode2.dom;

                    // Inicializar el contenido
                    const rawExternal = getRawExternalValue(vnode.attrs);
                    const { translations } = normalizeToTranslations(rawExternal);
                    const value = getTextForLang(translations, vnode.state.currentLang);

                    if (value) {
                        vnode2.dom.innerHTML = value;
                    }

                    // Configurar event listeners
                    const editorEl = vnode2.dom;

                    // Event listeners para input
                    editorEl.addEventListener('input', handleInput);

                    // Event listeners para selección
                    editorEl.addEventListener('keyup', (e) => {
                        syncSelectionState();
                    });

                    editorEl.addEventListener('mouseup', (e) => {
                        syncSelectionState();

                        // Click en enlace
                        const linkElement = e.target.closest('a');
                        if (linkElement) {
                            handleLinkClick(vnode, e, linkElement);
                            setupPopoverViewHandlers(vnode);
                        }

                        // Click en imagen
                        const imgElement = e.target.closest('img');
                        if (imgElement) {
                            handleImageClick(vnode, e, imgElement);
                        }

                        // Click en celda de tabla
                        const cellElement = e.target.closest('td, th');
                        if (cellElement) {
                            handleTableCellClick(vnode, e, cellElement);
                        }
                    });

                    // Event listener para teclado
                    editorEl.addEventListener('keydown', (e) => {
                        // Manejar Tab en tablas
                        if (e.key === 'Tab' && selectedTableCell) {
                            handleTableKeyboardNavigation(vnode, e);
                            return;
                        }

                        // Manejar Slash Commands
                        if (e.key === '/') {
                            const result = handleSlashCommandKeydown(vnode, e);
                            if (result) return;
                        }

                        // Manejar atajos de teclado
                        if (e.ctrlKey || e.metaKey) {
                            if (e.key === 'b') {
                                e.preventDefault();
                                applyCommand(vnode, { id: 'bold' });
                            } else if (e.key === 'i') {
                                e.preventDefault();
                                applyCommand(vnode, { id: 'italic' });
                            } else if (e.key === 'u') {
                                e.preventDefault();
                                applyCommand(vnode, { id: 'underline' });
                            } else if (e.key === 'k') {
                                e.preventDefault();
                                applyCommand(vnode, { id: 'link' });
                            }
                        }
                    });

                    // Event listener para pegado limpio (paste)
                    editorEl.addEventListener('paste', (e) => {
                        e.preventDefault();
                        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                        document.execCommand('insertText', false, text);
                    });

                    // Event listeners para drag & drop
                    editorEl.addEventListener('dragover', handleDragOver);
                    editorEl.addEventListener('dragenter', handleDragEnter);
                    editorEl.addEventListener('dragleave', handleDragLeave);
                    editorEl.addEventListener('drop', (e) => handleDrop(vnode, e));

                    // Event listener para focus
                    editorEl.addEventListener('focus', () => {
                        vnode.state.isFocused = true;
                        syncSelectionState();
                    });

                    editorEl.addEventListener('blur', () => {
                        vnode.state.isFocused = false;
                    });

                    // Configurar handlers de toolbars
                    setupImageToolbarHandlers(vnode);
                    setupImageResizeHandlers(vnode);
                    setupTableToolbarHandlers(vnode);

                    // Crear image file input
                    createImageFileInput(vnode);

                    // Actualizar estado activo inicialmente
                    updateActiveState(vnode.state);
                }
            }),

            // Footer con character count (opcional)
            vnode.attrs.characterCount ? m('div', {
                class: 'native-rich-editor__footer'
            }, [
                `${(vnode.state.editorEl?.textContent || '').length} / ${vnode.attrs.characterCount}`
            ]) : null
        ]);
    }
};
