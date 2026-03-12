/**
 * index.js - Punto de entrada del Editor
 * Componente Mithril que importa desde editor-core y editor-features
 * Ahora con Tiptap para el editor visual
 */

import './editor-features.js';

// Imports de Tiptap desde npm
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import ImageResize from 'tiptap-extension-resize-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import BubbleMenu from '@tiptap/extension-bubble-menu';

// Importar extensión de Slash Commands
import SlashCommands, { renderSlashCommands, slashCommandsList } from './slash-commands.js';

// Imports de CodeMirror desde npm
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/xml/xml.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import 'codemirror/mode/javascript/javascript.js';

// Importar desde editor-core (solo lo necesario)
import {
    ICONS,
    TOOLBAR_COMMANDS,
    DEFAULT_TOOLBAR_COMMAND,
    DEFAULT_LANG,
    SUPPORTED_LANGS,
    STYLE_ELEMENT_ID,
    sanitizeUrl,
    normalizeHtml,
    formatHTML,
    getRawExternalValue,
    normalizeToTranslations,
    getTextForLang,
    getExternalValue,
    emitChange,
    updateActiveState
} from './editor-core.js';

// Función simple de sanitización (Tiptap maneja sanitización internamente)
function sanitizeHtml(vnode, html) {
    if (!html) return '';
    // Tiptap ya sanea el contenido, aquí solo pasamos el HTML
    return html;
}

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
    createImageFileInput,
    insertImageContent,
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
    const commandId = typeof command === 'string' ? command : command.id;

    // El comando source siempre se maneja, incluso sin editor Tiptap
    if (commandId === 'source') {
        toggleSourceView(vnode);
        return;
    }

    const editor = vnode.state.tiptapEditor;
    if (!editor) return;

    // Redirigir las órdenes al motor de Tiptap
    switch (commandId) {
        case 'bold': editor.chain().focus().toggleBold().run(); break;
        case 'italic': editor.chain().focus().toggleItalic().run(); break;
        case 'underline': editor.chain().focus().toggleUnderline().run(); break;
        case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
        case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
        case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
        case 'list': editor.chain().focus().toggleBulletList().run(); break;
        case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
        case 'table':
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            break;
        case 'link':
            const url = window.prompt('URL del enlace:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
            break;
        case 'image':
            const imgUrl = window.prompt('URL de la imagen:');
            if (imgUrl) editor.chain().focus().setImage({ src: imgUrl }).run();
            break;
    }

    // Tiptap dispara onUpdate automáticamente
}

// activateInlineInput viene de editor-features.js

function activateInlineInput(vnode, mode) {
    const { state } = vnode;
    if (!state.editorEl) {
        return;
    }
    // Guardar posición del cursor con Tiptap
    if (state.tiptapEditor) {
        state.savedTiptapState = state.tiptapEditor.getState();
    }
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
        if (validUrl && state.tiptapEditor) {
            state.tiptapEditor.chain().focus().setLink({ href: validUrl }).run();
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
    // Restaurar foco en Tiptap
    if (state.tiptapEditor) {
        state.tiptapEditor.commands.focus();
    }
}

// ============================================
// MONACO EDITOR
// ============================================


// ============================================
// FUNCIONES DE TIP TAP
// ============================================

// Tiptap ya se carga via import npm al inicio del archivo

// ============================================
// BUBBLE MENU - Menú flotante para enlaces
// ============================================

let bubbleMenuElement = null;

function createBubbleMenuElement() {
    if (bubbleMenuElement) return bubbleMenuElement;

    bubbleMenuElement = document.createElement('div');
    bubbleMenuElement.className = 'bubble-menu';
    bubbleMenuElement.style.cssText = `
        display: flex;
        gap: 4px;
        padding: 8px;
        background: #1e1e1e;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    // Botón de negrita
    const boldBtn = document.createElement('button');
    boldBtn.innerHTML = '<strong>B</strong>';
    boldBtn.style.cssText = 'padding: 4px 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';
    boldBtn.onclick = () => {
        const editor = window._bubbleMenuEditor;
        if (editor) editor.chain().focus().toggleBold().run();
    };

    // Botón de cursiva
    const italicBtn = document.createElement('button');
    italicBtn.innerHTML = '<em>I</em>';
    italicBtn.style.cssText = 'padding: 4px 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-style: italic;';
    italicBtn.onclick = () => {
        const editor = window._bubbleMenuEditor;
        if (editor) editor.chain().focus().toggleItalic().run();
    };

    // Botón de enlace
    const linkBtn = document.createElement('button');
    linkBtn.innerHTML = '🔗';
    linkBtn.style.cssText = 'padding: 4px 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;';
    linkBtn.onclick = () => {
        const editor = window._bubbleMenuEditor;
        if (editor) {
            const url = window.prompt('URL del enlace:');
            if (url) {
                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
        }
    };

    // Botón de解除 enlace
    const unlinkBtn = document.createElement('button');
    unlinkBtn.innerHTML = '✂️';
    unlinkBtn.style.cssText = 'padding: 4px 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;';
    unlinkBtn.onclick = () => {
        const editor = window._bubbleMenuEditor;
        if (editor) editor.chain().focus().unsetLink().run();
    };

    bubbleMenuElement.appendChild(boldBtn);
    bubbleMenuElement.appendChild(italicBtn);
    bubbleMenuElement.appendChild(linkBtn);
    bubbleMenuElement.appendChild(unlinkBtn);

    return bubbleMenuElement;
}

function initTiptapEditor(vnode, container) {
    console.log('Inicializando editor Tiptap con npm packages');

    // Destruir editor anterior si existe
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.destroy();
    }

    console.log('Inicializando editor Tiptap, contenido:', vnode.state.lastEmittedValue ? vnode.state.lastEmittedValue.substring(0, 50) : 'vacío');

    const editor = new Editor({
        element: container,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank'
                }
            }),
            ImageResize.configure({
                inline: true,
                allowBase64: true
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph']
            }),
            Table.configure({
                resizable: true
            }),
            TableRow,
            TableHeader,
            TableCell,
            Placeholder.configure({
                placeholder: vnode.attrs.placeholder || 'Escribe algo aquí...'
            }),
            // Slash Commands - escribir "/" para ver menú
            SlashCommands.configure({
                suggestion: {
                    char: '/',
                    render: renderSlashCommands,
                },
            }),
            // Bubble Menu - menú flotante para enlaces y formato
            BubbleMenu.configure({
                element: createBubbleMenuElement(),
                tippyOptions: {
                    duration: 100,
                    placement: 'top',
                    interactive: true,
                },
            })
        ],
        content: vnode.state.lastEmittedValue || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            vnode.state.lastEmittedValue = html;

            // Manejar multidioma correctamente
            const rawExternal = getRawExternalValue(vnode.attrs);
            const { translations } = normalizeToTranslations(rawExternal);

            if (vnode.state.isMultiLang) {
                const newTranslations = { ...translations };
                newTranslations[vnode.state.currentLang] = html;
                if (vnode.attrs.onchange) {
                    vnode.attrs.onchange(JSON.stringify(newTranslations));
                }
            } else {
                if (vnode.attrs.onchange) {
                    vnode.attrs.onchange(html);
                }
            }
        },
        onSelectionUpdate: () => {
            m.redraw();
        },
        onFocus: () => {
            vnode.state.isFocused = true;
            m.redraw();
        },
        onBlur: () => {
            vnode.state.isFocused = false;
            m.redraw();
        }
    });

    vnode.state.tiptapEditor = editor;

    // Guardar referencia global para los botones del BubbleMenu
    window._bubbleMenuEditor = editor;

    return editor;
}

// Funciones para la toolbar de Tiptap
function toggleBold(vnode) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().toggleBold().run();
    }
}

function toggleItalic(vnode) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().toggleItalic().run();
    }
}

function toggleUnderline(vnode) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().toggleUnderline().run();
    }
}

function toggleHeading(vnode, level) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().toggleHeading({ level }).run();
    }
}

function toggleBulletList(vnode) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().toggleBulletList().run();
    }
}

function toggleOrderedList(vnode) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().toggleOrderedList().run();
    }
}

function toggleBlockquote(vnode) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().toggleBlockquote().run();
    }
}

function setTextAlign(vnode, align) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().setTextAlign(align).run();
    }
}

function insertLink(vnode, url) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().setLink({ href: url }).run();
    }
}

function insertImage(vnode, src) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().setImage({ src }).run();
    }
}

function insertTable(vnode, rows = 3, cols = 3) {
    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    }
}

// ============================================
// CODE MIRROR (Vista de código) - Ya no necesita carga CDN
// ============================================

function initCodeMirrorEditor(vnode, container) {
    // Limpiar contenedor
    container.innerHTML = '';

    // Destruir editor anterior si existe
    if (vnode.state.codeMirrorEditor) {
        vnode.state.codeMirrorEditor.toTextArea();
    }

    // Crear textarea
    const textarea = document.createElement('textarea');
    textarea.value = vnode.state.sourceValue || '';
    container.appendChild(textarea);

    // Inicializar CodeMirror usando el import
    const editor = CodeMirror.fromTextArea(textarea, {
        mode: 'htmlmixed',
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
        indentWithTabs: false,
        indentUnit: 2,
        extraKeys: {
            'Ctrl-Space': 'autocomplete'
        }
    });

    // Guardar referencia
    vnode.state.codeMirrorEditor = editor;

    // Listener para cambios
    editor.on('change', () => {
        vnode.state.sourceValue = editor.getValue();
        emitSourceChange(vnode);
    });

    editor.on('focus', () => {
        vnode.state.isSourceFocused = true;
    });

    editor.on('blur', () => {
        vnode.state.isSourceFocused = false;
    });
}

// updateActiveState viene de editor-core.js

function toggleSourceView(vnode) {
    const { state } = vnode;
    state.isSourceView = !state.isSourceView;

    hidePopover();
    hideTableToolbar(vnode);

    if (state.isSourceView) {
        // Entrar en modo código fuente - obtener contenido de Tiptap
        let html = state.lastEmittedValue || '';
        if (state.tiptapEditor) {
            html = state.tiptapEditor.getHTML();
            // Destruir editor Tiptap al entrar en modo código
            state.tiptapEditor.destroy();
            state.tiptapEditor = null;
        }
        const sanitized = sanitizeHtml(vnode, html);
        const normalized = normalizeHtml(sanitized);
        const formatted = formatHTML(normalized);
        state.sourceValue = formatted;

        // Actualizar CodeMirror si está disponible
        if (state.codeMirrorEditor) {
            state.codeMirrorEditor.setValue(formatted);
        }
        updateActiveState(state);
        m.redraw();

        // Forzar inicialización de CodeMirror después del redraw
        setTimeout(() => {
            const container = document.getElementById('codemirror-container-' + state.editorId);
            if (container && !state.codeMirrorEditor) {
                initCodeMirrorEditor(vnode, container);
            }
        }, 50);
        return;
    }

    // Salir del modo código fuente - obtener valor de CodeMirror o del state
    let rawSource = state.sourceValue || '';
    if (state.codeMirrorEditor) {
        rawSource = state.codeMirrorEditor.getValue();
        state.sourceValue = rawSource;
    }

    const unformatted = rawSource.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const sanitized = sanitizeHtml(vnode, unformatted);
    const normalized = normalizeHtml(sanitized);

    // Guardar el contenido para el editor Tiptap
    state.lastEmittedValue = normalized;

    // Limpiar CodeMirror
    if (state.codeMirrorEditor) {
        state.codeMirrorEditor.toTextArea();
        state.codeMirrorEditor = null;
    }

    // No recreamos Tiptap aquí - Mithril redesenhará la vista
    // y oncreate del div tiptap inicializará el editor

    updateActiveState(state);
    emitChange(vnode);
    m.redraw();
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const NativeRichEditor = {
    oninit: (vnode) => {
        ensureInlineStyles();
        // CodeMirror ya se carga via import npm
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
        // Generar ID único para el editor
        vnode.state.editorId = vnode.attrs.id || 'editor-' + Math.random().toString(36).substr(2, 9);
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
            // Ya no usamos sourceEl, leemos el state o preguntamos a Monaco
            const currentSource = vnode.state.codeMirrorEditor ? vnode.state.codeMirrorEditor.getValue() : vnode.state.sourceValue || '';
            const normalizedSource = normalizeHtml(sanitizeHtml(vnode, currentSource));
            const sizeDiff = Math.abs(normalizedExternal.length - normalizedSource.length);
            const isDrastic = !vnode.state.isSourceFocused || sizeDiff > 80;

            if (isDrastic && normalizedExternal !== normalizedSource) {
                vnode.state.sourceValue = normalizedExternal;
                // Si Monaco está activo, le inyectamos el nuevo valor
                if (vnode.state.codeMirrorEditor && vnode.state.codeMirrorEditor.getValue() !== normalizedExternal) {
                    vnode.state.codeMirrorEditor.setValue(normalizedExternal);
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
            // Tiptap maneja el estado de selección automáticamente
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
                    // Magia de Tiptap: Saber si un botón debe estar iluminado
                    let isActive = false;
                    const editor = vnode.state.tiptapEditor;

                    if (editor) {
                        if (cmd.id === 'h1') isActive = editor.isActive('heading', { level: 1 });
                        else if (cmd.id === 'h2') isActive = editor.isActive('heading', { level: 2 });
                        else if (cmd.id === 'quote') isActive = editor.isActive('blockquote');
                        else if (cmd.id === 'list') isActive = editor.isActive('bulletList');
                        else if (cmd.id === 'ordered') isActive = editor.isActive('orderedList');
                        else isActive = editor.isActive(cmd.id);
                    }

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

            // Modo código fuente (CodeMirror) o modo visual (Tiptap)
            isSourceView ? m('div', {
                class: 'native-rich-editor__source-wrapper',
                id: 'codemirror-container-' + vnode.state.editorId,
                style: 'height: 400px; width: 100%; display: block;',
                oncreate: (vnode2) => {
                    if (!vnode.state.codeMirrorEditor) {
                        initCodeMirrorEditor(vnode, vnode2.dom);
                    }
                },
                onremove: () => {
                    if (vnode.state.codeMirrorEditor) {
                        vnode.state.codeMirrorEditor.toTextArea();
                        vnode.state.codeMirrorEditor = null;
                    }
                }
            }) : m('div', {
                class: 'native-rich-editor__surface tiptap-wrapper'
            }, [
                m('div', {
                    class: 'native-rich-editor__tiptap',
                    oncreate: (vnode2) => {
                        initTiptapEditor(vnode, vnode2.dom);
                    },
                    // PROTEGER A TIP TAP DE MITHRIL
                    onbeforeupdate: () => false,
                    // Los menús flotantes ahora los maneja Tiptap (BubbleMenu, Slash Commands)
                    onclick: (event) => {
                        const target = event.target;

                        // Clic en celda de tabla
                        if (target.tagName === 'TD' || target.tagName === 'TH') {
                            handleTableCellClick(vnode, event, target);
                            return;
                        }
                    }
                })
            ]),

            // Footer con character count (opcional)
            vnode.attrs.characterCount ? m('div', {
                class: 'native-rich-editor__footer'
            }, [
                `${(vnode.state.editorEl?.textContent || '').length} / ${vnode.attrs.characterCount}`
            ]) : null
        ]);
    }
};
