/**
 * index.js - Punto de entrada del Editor
 * Componente Mithril con Tiptap para el editor visual
 * (editor-features.js eliminado - funciones movidas aquí)
 */

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

// ============================================
// ELEMENTOS GLOBALES (para hide functions)
// ============================================

let popoverElement = null;
let tableToolbarElement = null;
let slashMenuElement = null;

// Funciones simples para ocultar elementos
function hidePopover() {
    if (popoverElement) popoverElement.style.display = 'none';
}

function hideTableToolbar(vnode) {
    if (tableToolbarElement) tableToolbarElement.style.display = 'none';
}

function hideSlashMenu() {
    // Slash menu ya no se usa activamente
}

function handleDrop(e) {
    e.preventDefault();
}

// Función para manejar clics en celdas de tabla
function handleTableCellClick(vnode, event, cellElement) {
    // Tiptap maneja la selección de celdas automáticamente
}

// ============================================
// IMAGE FILE INPUT (desde editor-features.js)
// ============================================

let imageFileInput = null;

function createImageFileInput(vnode) {
    if (imageFileInput) {
        imageFileInput._editorVnode = vnode;
        return imageFileInput;
    }
    imageFileInput = document.createElement('input');
    imageFileInput.type = 'file';
    imageFileInput.accept = 'image/*';
    imageFileInput.multiple = true;
    imageFileInput.style.display = 'none';
    imageFileInput._editorVnode = vnode;
    document.body.appendChild(imageFileInput);

    imageFileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const vnode = imageFileInput._editorVnode;
        if (!vnode) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target.result;
                const editor = vnode.state.tiptapEditor;
                if (editor) {
                    editor.chain().focus().setImage({ src }).run();
                    emitChange(vnode);
                }
            };
            reader.readAsDataURL(file);
        });
        imageFileInput.value = '';
    });
    return imageFileInput;
}

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

// activateInlineInput

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
            // extendMarkRange selecciona el enlace completo antes de actualizar
            state.tiptapEditor.chain().focus().extendMarkRange('link').setLink({ href: validUrl }).run();
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
// BUBBLE MENU - Menú flotante para enlaces y para imágenes
// ============================================

let bubbleMenuElement = null;
let linkInputContainer = null;
let linkInput = null;

let imageBubbleMenuElement = null;
let altInputContainer = null;
let altInput = null;

function createBubbleMenuElement(vnode) {
    if (bubbleMenuElement) return bubbleMenuElement;

    bubbleMenuElement = document.createElement('div');
    bubbleMenuElement.className = 'bubble-menu';
    bubbleMenuElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: #1e1e1e;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Función helper para crear botones
    const createBtn = (html, title, onClick) => {
        const btn = document.createElement('button');
        btn.innerHTML = html;
        btn.title = title;
        btn.style.cssText = `
            padding: 6px 10px;
            background: transparent;
            color: #e0e0e0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.15s;
        `;
        btn.onmouseenter = () => btn.style.background = '#333';
        btn.onmouseleave = () => btn.style.background = 'transparent';
        btn.onclick = onClick;
        return btn;
    };

    // Botones de formato rápido en el menú de enlace
    const boldBtn = createBtn('<strong>B</strong>', 'Negrita', () => {
        const editor = vnode.state.tiptapEditor;
        if (editor) editor.chain().focus().toggleBold().run();
    });

    const linkBtn = createBtn('🔗', 'Editar enlace', () => {
        const editor = vnode.state.tiptapEditor;
        if (!editor) return;
        const attrs = editor.getAttributes('link');
        linkInput.value = attrs.href || '';
        linkInputContainer.style.display = 'flex';
        setTimeout(() => linkInput.focus(), 10);
    });

    linkInputContainer = document.createElement('div');
    linkInputContainer.style.cssText = 'display: none; align-items: center; gap: 6px; margin-left: 4px;';
    
    linkInput = document.createElement('input');
    linkInput.type = 'text';
    linkInput.placeholder = 'https://...';
    linkInput.style.cssText = 'padding: 5px 10px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #e0e0e0; font-size: 13px; width: 180px; outline: none;';
    linkInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            vnode.state.tiptapEditor.chain().focus().extendMarkRange('link').setLink({ href: linkInput.value.trim() }).run();
            linkInputContainer.style.display = 'none';
        }
    };

    const confirmLinkBtn = document.createElement('button');
    confirmLinkBtn.innerHTML = '✓';
    confirmLinkBtn.style.cssText = 'padding: 5px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;';
    confirmLinkBtn.onclick = () => {
        vnode.state.tiptapEditor.chain().focus().extendMarkRange('link').setLink({ href: linkInput.value.trim() }).run();
        linkInputContainer.style.display = 'none';
    };

    linkInputContainer.appendChild(linkInput);
    linkInputContainer.appendChild(confirmLinkBtn);

    const unlinkBtn = createBtn('✂️', 'Quitar enlace', () => {
        vnode.state.tiptapEditor.chain().focus().unsetLink().run();
    });

    bubbleMenuElement.appendChild(boldBtn);
    bubbleMenuElement.appendChild(linkBtn);
    bubbleMenuElement.appendChild(linkInputContainer);
    bubbleMenuElement.appendChild(unlinkBtn);

    return bubbleMenuElement;
}

function createImageBubbleMenuElement(vnode) {
    if (imageBubbleMenuElement) return imageBubbleMenuElement;

    imageBubbleMenuElement = document.createElement('div');
    imageBubbleMenuElement.className = 'bubble-menu bubble-menu--image';
    imageBubbleMenuElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: #1e1e1e;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const createBtn = (html, title, onClick) => {
        const btn = document.createElement('button');
        btn.innerHTML = html;
        btn.title = title;
        btn.style.cssText = `
            padding: 6px 10px;
            background: transparent;
            color: #e0e0e0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.15s;
        `;
        btn.onmouseenter = () => btn.style.background = '#333';
        btn.onmouseleave = () => btn.style.background = 'transparent';
        btn.onclick = onClick;
        return btn;
    };

    // Botón ALT (SEO)
    const altBtn = createBtn('📝', 'Texto alternativo (SEO)', () => {
        const editor = vnode.state.tiptapEditor;
        if (!editor) return;
        const attrs = editor.getAttributes('image');
        altInput.value = attrs.alt || '';
        altInputContainer.style.display = 'flex';
        setTimeout(() => altInput.focus(), 10);
    });

    altInputContainer = document.createElement('div');
    altInputContainer.style.cssText = 'display: none; align-items: center; gap: 6px; margin-left: 4px;';
    
    altInput = document.createElement('input');
    altInput.type = 'text';
    altInput.placeholder = 'Descripción para Google...';
    altInput.style.cssText = 'padding: 5px 10px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #e0e0e0; font-size: 13px; width: 150px; outline: none;';
    altInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            vnode.state.tiptapEditor.chain().focus().updateAttributes('image', { alt: altInput.value.trim() }).run();
            altInputContainer.style.display = 'none';
        }
    };

    const confirmAltBtn = document.createElement('button');
    confirmAltBtn.innerHTML = '✓';
    confirmAltBtn.style.cssText = 'padding: 5px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;';
    confirmAltBtn.onclick = () => {
        vnode.state.tiptapEditor.chain().focus().updateAttributes('image', { alt: altInput.value.trim() }).run();
        altInputContainer.style.display = 'none';
    };

    altInputContainer.appendChild(altInput);
    altInputContainer.appendChild(confirmAltBtn);

    // Botones de alineación
    const leftBtn = createBtn('⬅️', 'Alinear izquierda', () => {
        vnode.state.tiptapEditor.chain().focus().setTextAlign('left').run();
    });
    const centerBtn = createBtn('↔️', 'Centrar', () => {
        vnode.state.tiptapEditor.chain().focus().setTextAlign('center').run();
    });
    const rightBtn = createBtn('➡️', 'Alinear derecha', () => {
        vnode.state.tiptapEditor.chain().focus().setTextAlign('right').run();
    });

    const deleteBtn = createBtn('🗑️', 'Eliminar imagen', () => {
        vnode.state.tiptapEditor.chain().focus().deleteSelection().run();
    });

    imageBubbleMenuElement.appendChild(altBtn);
    imageBubbleMenuElement.appendChild(altInputContainer);
    imageBubbleMenuElement.appendChild(leftBtn);
    imageBubbleMenuElement.appendChild(centerBtn);
    imageBubbleMenuElement.appendChild(rightBtn);
    imageBubbleMenuElement.appendChild(deleteBtn);

    return imageBubbleMenuElement;
}

function initTiptapEditor(vnode, container) {
    console.log('Inicializando editor Tiptap con funciones de CMS');

    if (vnode.state.tiptapEditor) {
        vnode.state.tiptapEditor.destroy();
    }

    const editor = new Editor({
        element: container,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] }
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
            }),
            ImageResize.configure({
                inline: true,
                allowBase64: true
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image']
            }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            Placeholder.configure({
                placeholder: vnode.attrs.placeholder || 'Escribe algo aquí...'
            }),
            SlashCommands.configure({
                suggestion: { char: '/', render: renderSlashCommands }
            }),
            // Menú para Enlaces
            BubbleMenu.configure({
                pluginKey: 'linkMenu',
                element: createBubbleMenuElement(vnode),
                shouldShow: ({ editor }) => editor.isActive('link'),
                tippyOptions: { duration: 100, placement: 'top', interactive: true }
            }),
            // Menú para Imágenes
            BubbleMenu.configure({
                pluginKey: 'imageMenu',
                element: createImageBubbleMenuElement(vnode),
                shouldShow: ({ editor }) => editor.isActive('image'),
                tippyOptions: { duration: 100, placement: 'top', interactive: true }
            })
        ],
        content: vnode.state.lastEmittedValue || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            vnode.state.lastEmittedValue = html;
            vnode.state.lastExternalValue = html; // FIX: Evitar que el cursor salte

            const rawExternal = getRawExternalValue(vnode.state.getAttrs());
            const { isMulti, translations } = normalizeToTranslations(rawExternal);

            // Actualizar estado isMultiLang
            const wasMultiLang = vnode.state.isMultiLang;
            vnode.state.isMultiLang = isMulti;

            // Si acabamos de cambiar a multilingüe, no reemitir - el valor ya es correcto
            if (!wasMultiLang && isMulti) {
                return;
            }

            // Determinar el valor actual del idioma activo
            const currentLangValue = isMulti ? (translations[vnode.state.currentLang] || '') : rawExternal;

            // Solo emitir si el contenido del idioma actual cambió
            if (html !== currentLangValue) {
                if (isMulti) {
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

    // Listener para cambios en CodeMirror
    editor.on('change', () => {
        const val = editor.getValue();
        vnode.state.sourceValue = val;
        vnode.state.lastEmittedValue = val;
        vnode.state.lastExternalValue = val; // FIX: Crítico para Mithril

        // Guardado Multidioma Moderno
        const rawExternal = getRawExternalValue(vnode.state.getAttrs());
        const { isMulti, translations } = normalizeToTranslations(rawExternal);

        if (isMulti) {
            const newTranslations = { ...translations };
            newTranslations[vnode.state.currentLang] = val;
            if (vnode.attrs.onchange) vnode.attrs.onchange(JSON.stringify(newTranslations));
        } else {
            if (vnode.attrs.onchange) vnode.attrs.onchange(val);
        }
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

    // Limpiar CodeMirror y eliminar el textarea fantasma
    if (state.codeMirrorEditor) {
        const textarea = state.codeMirrorEditor.getTextArea(); // 1. Cazamos el textarea
        state.codeMirrorEditor.toTextArea(); // 2. Destruimos CodeMirror
        if (textarea && textarea.parentNode) textarea.remove(); // 3. Matamos al fantasma!
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
        vnode.state.currentVnode = vnode; // FIX: Guardar referencia fresca para evitar closure obsoleto
        vnode.state.getAttrs = () => vnode.attrs; // Puente en tiempo real para Tiptap/CodeMirror
        ensureInlineStyles();
        // CodeMirror ya se carga via import npm
        const attrs = vnode.attrs || {};

        // FIX: Detectar modo multidioma correctamente desde el inicio
        const rawExternal = getRawExternalValue(attrs);
        const { isMulti, translations } = normalizeToTranslations(rawExternal);

        vnode.state.currentLang = DEFAULT_LANG;
        vnode.state.isMultiLang = isMulti;
        vnode.state.isMultiLangWasString = !isMulti && typeof rawExternal === 'string';

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

        // Destruir Tiptap para evitar fugas de memoria
        if (vnode.state.tiptapEditor) {
            vnode.state.tiptapEditor.destroy();
            vnode.state.tiptapEditor = null;
        }

        // Destruir CodeMirror para evitar fugas de memoria
        if (vnode.state.codeMirrorEditor) {
            vnode.state.codeMirrorEditor.toTextArea();
            vnode.state.codeMirrorEditor = null;
        }
    },

    onupdate: (vnode) => {
        vnode.state.currentVnode = vnode; // FIX: Actualizar referencia fresca en cada repintado
        vnode.state.getAttrs = () => vnode.attrs; // Puente en tiempo real para Tiptap/CodeMirror
        const externalValue = getExternalValue(vnode);
        const { editorEl, isFocused } = vnode.state;

        if (externalValue === vnode.state.lastExternalValue) {
            // FIX: Recalcular isMultiLang cuando cambia el valor externo
            const rawExternal = getRawExternalValue(vnode.attrs);
            const wasMultiLang = vnode.state.isMultiLang;
            const { isMulti } = normalizeToTranslations(rawExternal);

            if (wasMultiLang !== isMulti) {
                vnode.state.isMultiLang = isMulti;
            }
            return;
        }

        vnode.state.lastExternalValue = externalValue;

        const sanitizedExternal = sanitizeHtml(vnode, externalValue);
        const normalizedExternal = normalizeHtml(sanitizedExternal);

        // FIX: Recalcular isMultiLang
        const rawExternal = getRawExternalValue(vnode.attrs);
        const { isMulti } = normalizeToTranslations(rawExternal);
        vnode.state.isMultiLang = isMulti;

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

        // FIX: Usar Tiptap API si está disponible
        if (vnode.state.tiptapEditor) {
            const currentContent = vnode.state.tiptapEditor.getHTML();
            const normalizedContent = normalizeHtml(currentContent);

            // Si es multilingüe, extraer solo el valor del idioma activo
            const { isMulti, translations } = normalizeToTranslations(rawExternal);
            let valueToSet = normalizedExternal;
            if (isMulti) {
                const activeLang = vnode.state.currentLang || 'es';
                valueToSet = translations[activeLang] || '';
            }

            // Solo actualizar si hay diferencias significativas
            const sizeDiff = Math.abs(valueToSet.length - normalizedContent.length);
            const isDrastic = !isFocused || sizeDiff > 80;

            if (isDrastic && valueToSet !== normalizedContent) {
                vnode.state.tiptapEditor.commands.setContent(valueToSet);
            }
            return;
        }

        // Fallback para editor legacy
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
        const isSourceView = vnode.state.isSourceView;
        // Leemos de getAttrs() para que el idioma no desaparezca al escribir
        const rawExternal = getRawExternalValue(vnode.state.getAttrs ? vnode.state.getAttrs() : vnode.attrs);
        const isMultiLangMode = vnode.state.isMultiLang;
        const activeLang = vnode.state.currentLang || DEFAULT_LANG;
        const supported_toolbar_commands = vnode.attrs.supported_toolbar_commands || DEFAULT_TOOLBAR_COMMAND;

        // Limpiamos las keys de los botones, no hacen falta
        const leftGroup = [];
        const rightGroup = [];

        // 1. Botones de Formato
        const filteredCommands = TOOLBAR_COMMANDS.filter(cmd => supported_toolbar_commands.includes(cmd.id));
        filteredCommands.forEach(cmd => {
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
            if (cmd.shortcut) title += ` (${cmd.shortcut})`;

            const btn = m('button', {
                key: 'cmd-' + cmd.id,
                type: 'button',
                class: buttonClass,
                title: title,
                'data-command': cmd.id,
                onclick: (e) => { e.preventDefault(); applyCommand(vnode, cmd.id); }
            }, m.trust(ICONS[cmd.icon] || ICONS.listAlt));

            if (cmd.id === 'source') {
                rightGroup.push(btn);
            } else {
                leftGroup.push(btn);
            }
        });

        // 2. Botones de Multidioma
        if (isMultiLangMode) {
            rightGroup.unshift(
                m('div', {
                    key: 'lang-label',
                    class: 'native-rich-editor__button-label',
                    style: 'margin-right: 0.5rem; font-weight: 500; font-size: 0.85rem;'
                }, activeLang.toUpperCase())
            );

            SUPPORTED_LANGS.forEach(lang => {
                const isCurrentLang = lang === activeLang;
                rightGroup.push(
                    m('button', {
                        key: 'lang-btn-' + lang,
                        type: 'button',
                        class: `native-rich-editor__button native-rich-editor__button--lang${isCurrentLang ? ' is-active' : ''}`,
                        title: lang.toUpperCase(),
                        onclick: (e) => {
                            e.preventDefault();
                            // Leer el valor del idioma seleccionado desde los attrs actualizados
                            const rawExternal = getRawExternalValue(vnode.state.getAttrs ? vnode.state.getAttrs() : vnode.attrs);
                            const { translations } = normalizeToTranslations(rawExternal);
                            const newValue = translations[lang] || '';

                            vnode.state.currentLang = lang;
                            vnode.state.lastExternalValue = newValue;
                            vnode.state.lastEmittedValue = newValue;

                            if (vnode.state.isSourceView && vnode.state.codeMirrorEditor) {
                                vnode.state.sourceValue = newValue;
                                vnode.state.codeMirrorEditor.setValue(newValue);
                            } else if (vnode.state.tiptapEditor) {
                                vnode.state.tiptapEditor.commands.setContent(newValue);
                            }
                            m.redraw();
                        }
                    }, [ m('span', { key: 'lang-span-' + lang, class: 'native-rich-editor__button-icon' }, lang.toUpperCase()) ])
                );
            });

            // Botón: De Multidioma a Texto Simple
            if (!isSourceView) {
                rightGroup.push(
                    m('button', {
                        key: 'toggle-lang-off',
                        type: 'button',
                        class: 'native-rich-editor__button',
                        title: 'Desactivar traducción (Modo texto)',
                        onclick: (e) => {
                            e.preventDefault();
                            // Contar cuántos idiomas tienen contenido (sin contar "und")
                            const rawExternal = getRawExternalValue(vnode.state.getAttrs ? vnode.state.getAttrs() : vnode.attrs);
                            const { translations } = normalizeToTranslations(rawExternal);
                            let filledLangs = 0;
                            let filledLangName = '';
                            SUPPORTED_LANGS.forEach(lang => {
                                if (lang !== 'und' && translations[lang] && translations[lang].trim() !== '') {
                                    filledLangs++;
                                    filledLangName = lang.toUpperCase();
                                }
                            });

                            // Solo se puede convertir si hay exactamente 1 idioma con contenido
                            if (filledLangs === 0) {
                                // No hay contenido en ningún idioma, convertir directamente
                                vnode.state.isMultiLang = false;
                                if (vnode.attrs.onchange) vnode.attrs.onchange('');
                            } else if (filledLangs === 1) {
                                // Hay exactamente 1 idioma, preguntar confirmación
                                if (confirm('¿Convertir a texto único? El contenido en ' + filledLangName + ' se mantendrá.')) {
                                    vnode.state.isMultiLang = false;
                                    if (vnode.attrs.onchange) vnode.attrs.onchange(vnode.state.lastEmittedValue);
                                }
                            } else {
                                // Hay más de 1 idioma, no permitir
                                alert('No se puede convertir a texto único porque hay contenido en varios idiomas (' + filledLangs + '). Traduce primero los demás idiomas.');
                            }
                        }
                    }, m.trust(ICONS.list))
                );
            }
        } else if (!isSourceView) {
            // Botón: De Texto Simple a Multidioma (Bola del mundo)
            rightGroup.push(
                m('button', {
                    key: 'toggle-lang-on',
                    type: 'button',
                    class: 'native-rich-editor__button',
                    title: 'Activar traducción',
                    onclick: (e) => {
                        e.preventDefault();
                        // Guardamos en "und" (undefined/indeterminado) porque no sabemos el idioma
                        const targetLang = 'und';
                        vnode.state.isMultiLang = true;
                        vnode.state.currentLang = targetLang;
                        // Solo guardamos el valor actual en "und", los demás vacíos
                        const currentVal = vnode.state.lastEmittedValue || '';
                        const multiLangValue = {};
                        SUPPORTED_LANGS.forEach(lang => {
                            multiLangValue[lang] = (lang === targetLang) ? currentVal : '';
                        });

                        if (vnode.attrs.onchange) {
                            vnode.attrs.onchange(JSON.stringify(multiLangValue));
                        }
                    }
                }, '🌍')
            );
        }

        // 3. ESTRUCTURA FINAL (Corregido: Con Keys)
        return m('div', {
            style: "width: 100%",
            class: `native-rich-editor${isSourceView ? ' native-rich-editor--source' : ''}`
        }, [
            // Bloque A: Toolbar con grupos de botones
            m('div', { class: 'native-rich-editor__toolbar', role: 'toolbar' }, [
                m('div', { key: 'toolbar-left', style: 'display: flex; gap: 0.25rem; align-items: center; flex-wrap: wrap;' }, leftGroup),
                m('div', { key: 'toolbar-spacer', style: 'flex: 1;' }), // Espaciador que empuja
                m('div', { key: 'toolbar-right', style: 'display: flex; gap: 0.25rem; align-items: center; flex-wrap: wrap;' }, rightGroup)
            ]),

            // Bloque B: CONTENEDOR AISLADO PARA LOS EDITORES (Soluciona el crasheo)
            // Al meter los elementos con Key dentro de su propio contenedor exclusivo, Mithril no se confunde
            m('div', { class: 'native-rich-editor__body-wrapper', style: 'position: relative;' }, [
                isSourceView 
                ? m('div', {
                    key: 'source-view-' + vnode.state.editorId, // Key permitida aquí
                    class: 'native-rich-editor__source-wrapper',
                    style: 'height: 400px; width: 100%; display: block;',
                    oncreate: (vnode2) => {
                        if (!vnode.state.codeMirrorEditor) initCodeMirrorEditor(vnode, vnode2.dom);
                    },
                    onremove: () => {
                        if (vnode.state.codeMirrorEditor) {
                            const textarea = vnode.state.codeMirrorEditor.getTextArea();
                            vnode.state.codeMirrorEditor.toTextArea();
                            if (textarea && textarea.parentNode) textarea.remove();
                            vnode.state.codeMirrorEditor = null;
                        }
                    }
                }) 
                : m('div', {
                    key: 'visual-view-' + vnode.state.editorId, // Key permitida aquí
                    class: 'native-rich-editor__surface tiptap-wrapper'
                }, [
                    m('div', {
                        class: 'native-rich-editor__tiptap',
                        oncreate: (vnode2) => { initTiptapEditor(vnode, vnode2.dom); },
                        onbeforeupdate: () => false
                    })
                ])
            ]),

            // Bloque C: Footer sin keys
            vnode.attrs.characterCount 
            ? m('div', { class: 'native-rich-editor__footer' }, [
                `${(vnode.state.tiptapEditor?.getText().length || 0)} / ${vnode.attrs.characterCount}`
            ]) 
            : null
        ]);
    }
};
