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
    LANG_NAMES,
    getLangName,
    STYLE_ELEMENT_ID,
    sanitizeUrl,
    normalizeHtml,
    formatHTML,
    getRawExternalValue,
    normalizeToTranslations,
    getTextForLang,
    getExternalValue,
    emitChange,
    updateActiveState,
    translateSALT
} from './editor-core.js';

// Función simple de sanitización (Tiptap maneja sanitización internamente)
function sanitizeHtml(vnode, html) {
    if (!html) return '';
    // Tiptap ya sanea el contenido, aquí solo pasamos el HTML
    return html;
}

// Función para filtrar idiomas vacíos de un objeto de traducciones
function cleanTranslations(translations) {
    const cleaned = {};
    Object.keys(translations).forEach(lang => {
        if (translations[lang] && translations[lang].trim() !== '') {
            cleaned[lang] = translations[lang];
        }
    });
    return cleaned;
}

// Función helper para actualizar data[name] y llamar a onchange (con debounce)
function updateValue(vnode, value) {
    // Si es multilingüe y es un objeto, filtrar idiomas vacíos
    let finalValue = value;
    if (vnode.state.isMultiLang && typeof value === 'object' && value !== null) {
        finalValue = cleanTranslations(value);
    }

    // Actualizar data inmediatamente para mantener el modelo sincronizado
    if (vnode.attrs.data && vnode.attrs.name) {
        vnode.attrs.data[vnode.attrs.name] = finalValue;
    }

    // Evitar saturar a Mithril con un debounce de 300ms para onchange
    if (vnode.state.typingTimeout) {
        clearTimeout(vnode.state.typingTimeout);
    }

    vnode.state.typingTimeout = setTimeout(() => {
        if (vnode.attrs.onchange) {
            vnode.attrs.onchange(finalValue);
        }
    }, 300);
}

// ============================================
// ELEMENTOS GLOBALES (para hide functions)
// ============================================

let popoverElement = null;
let tableToolbarElement = null;
let slashMenuElement = null;
let imageToolbarElement = null;

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

function cleanupAllBlobUrls(vnode) {
    // No hay blob URLs que limpiar en este componente
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
            // Si ya hay un enlace activo, el BubbleMenu se encarga de editarlo
            // Si no, el BubbleMenu aparecerá automáticamente con el input para crear uno nuevo
            editor.chain().focus();
            break;
        case 'image':
            // Usar onClickImage custom si está definido, si no fallback a prompt
            if (vnode.attrs.onClickImage) {
                // Crear función que inserta HTML en el cursor actual
                const insertHtml = (html) => {
                    editor.chain().focus().insertContent(html).run();
                    emitChange(vnode);
                };
                vnode.attrs.onClickImage(insertHtml);
            } else {
                const imgUrl = window.prompt('URL de la imagen:');
                if (imgUrl) editor.chain().focus().setImage({ src: imgUrl }).run();
            }
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

function createLinkBubbleMenu(vnode) {
    // Si ya existe para esta instancia, lo devolvemos
    if (vnode.state.linkBubbleMenuElement) return vnode.state.linkBubbleMenuElement;

    const menu = document.createElement('div');
    menu.className = 'bubble-menu bubble-menu--link';
    menu.style.cssText = `
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

    // Contenedor de input para crear/editar enlace
    vnode.state.linkInputContainer = document.createElement('div');
    vnode.state.linkInputContainer.style.cssText = 'display: none; align-items: center; gap: 6px; margin-left: 4px;';

    vnode.state.linkInput = document.createElement('input');
    vnode.state.linkInput.type = 'text';
    vnode.state.linkInput.placeholder = 'https://...';
    vnode.state.linkInput.style.cssText = 'padding: 5px 10px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #e0e0e0; font-size: 13px; width: 220px; outline: none;';
    vnode.state.linkInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const url = vnode.state.linkInput.value.trim();
            if (url) {
                if (vnode.state.linkEditMode) {
                    vnode.state.tiptapEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                } else {
                    vnode.state.tiptapEditor.chain().focus().setLink({ href: url }).run();
                }
            }
            vnode.state.linkInputContainer.style.display = 'none';
            vnode.state.linkEditMode = false;
        }
        if (e.key === 'Escape') {
            vnode.state.linkInputContainer.style.display = 'none';
            vnode.state.linkEditMode = false;
        }
    };

    const confirmLinkBtn = document.createElement('button');
    confirmLinkBtn.innerHTML = '✓';
    confirmLinkBtn.title = 'Aplicar';
    confirmLinkBtn.style.cssText = 'padding: 5px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;';
    confirmLinkBtn.onclick = () => {
        const url = vnode.state.linkInput.value.trim();
        if (url) {
            if (vnode.state.linkEditMode) {
                vnode.state.tiptapEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            } else {
                vnode.state.tiptapEditor.chain().focus().setLink({ href: url }).run();
            }
        }
        vnode.state.linkInputContainer.style.display = 'none';
        vnode.state.linkEditMode = false;
    };

    const cancelLinkBtn = document.createElement('button');
    cancelLinkBtn.innerHTML = '✕';
    cancelLinkBtn.title = 'Cancelar';
    cancelLinkBtn.style.cssText = 'padding: 5px 8px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 2px;';
    cancelLinkBtn.onclick = () => {
        vnode.state.linkInputContainer.style.display = 'none';
        vnode.state.linkEditMode = false;
    };

    vnode.state.linkInputContainer.appendChild(vnode.state.linkInput);
    vnode.state.linkInputContainer.appendChild(confirmLinkBtn);
    vnode.state.linkInputContainer.appendChild(cancelLinkBtn);

    // Botón para crear enlace (visible cuando NO hay link activo)
    const createLinkBtn = createBtn('🔗', 'Crear enlace', () => {
        const editor = vnode.state.tiptapEditor;
        if (!editor) return;
        vnode.state.linkInput.value = '';
        vnode.state.linkInput.placeholder = 'https://...';
        vnode.state.linkEditMode = false;
        vnode.state.linkInputContainer.style.display = 'flex';
        vnode.state.linkInput.style.display = 'block';
        confirmLinkBtn.style.display = 'block';
        cancelLinkBtn.style.display = 'inline-block';
        setTimeout(() => vnode.state.linkInput.focus(), 10);
    });

    // Botón para editar enlace (visible cuando HAY link activo)
    const editLinkBtn = createBtn('✏️', 'Editar enlace', () => {
        const editor = vnode.state.tiptapEditor;
        if (!editor) return;
        const attrs = editor.getAttributes('link');
        vnode.state.linkInput.value = attrs.href || '';
        vnode.state.linkInput.placeholder = 'Editar URL...';
        vnode.state.linkEditMode = true;
        vnode.state.linkInputContainer.style.display = 'flex';
        vnode.state.linkInput.style.display = 'block';
        confirmLinkBtn.style.display = 'block';
        cancelLinkBtn.style.display = 'inline-block';
        setTimeout(() => vnode.state.linkInput.focus(), 10);
    });

    // Botón desvincular
    const unlinkBtn = createBtn('✂️', 'Quitar enlace', () => {
        vnode.state.tiptapEditor.chain().focus().unsetLink().run();
    });

    // Actualizar visibilidad de botones según el estado del enlace
    function updateLinkMenuButtons() {
        const editor = vnode.state.tiptapEditor;
        if (!editor) return;
        const isActive = editor.isActive('link');
        createLinkBtn.style.display = isActive ? 'none' : 'block';
        editLinkBtn.style.display = isActive ? 'block' : 'none';
        unlinkBtn.style.display = isActive ? 'block' : 'none';
    }

    // Añadir elementos al menú
    menu.appendChild(createLinkBtn);
    menu.appendChild(editLinkBtn);
    menu.appendChild(unlinkBtn);
    menu.appendChild(vnode.state.linkInputContainer);

    // Guardar referencias y función de actualización
    vnode.state.createLinkBtn = createLinkBtn;
    vnode.state.editLinkBtn = editLinkBtn;
    vnode.state.updateLinkMenuButtons = updateLinkMenuButtons;

    // Actualizar botones inicialmente
    updateLinkMenuButtons();

    // Guardar referencia en el estado del vnode
    vnode.state.linkBubbleMenuElement = menu;

    return menu;
}

function createImageBubbleMenuElement(vnode) {
    // Si ya existe para esta instancia, lo devolvemos
    if (vnode.state.imageBubbleMenuElement) return vnode.state.imageBubbleMenuElement;

    const menu = document.createElement('div');
    menu.className = 'bubble-menu bubble-menu--image';
    menu.style.cssText = `
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
        vnode.state.altInput.value = attrs.alt || '';
        vnode.state.altInputContainer.style.display = 'flex';
        setTimeout(() => vnode.state.altInput.focus(), 10);
    });

    vnode.state.altInputContainer = document.createElement('div');
    vnode.state.altInputContainer.style.cssText = 'display: none; align-items: center; gap: 6px; margin-left: 4px;';

    vnode.state.altInput = document.createElement('input');
    vnode.state.altInput.type = 'text';
    vnode.state.altInput.placeholder = 'Descripción para Google...';
    vnode.state.altInput.style.cssText = 'padding: 5px 10px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #e0e0e0; font-size: 13px; width: 150px; outline: none;';
    vnode.state.altInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            vnode.state.tiptapEditor.chain().focus().updateAttributes('image', { alt: vnode.state.altInput.value.trim() }).run();
            vnode.state.altInputContainer.style.display = 'none';
        }
    };

    const confirmAltBtn = document.createElement('button');
    confirmAltBtn.innerHTML = '✓';
    confirmAltBtn.style.cssText = 'padding: 5px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;';
    confirmAltBtn.onclick = () => {
        vnode.state.tiptapEditor.chain().focus().updateAttributes('image', { alt: vnode.state.altInput.value.trim() }).run();
        vnode.state.altInputContainer.style.display = 'none';
    };

    vnode.state.altInputContainer.appendChild(vnode.state.altInput);
    vnode.state.altInputContainer.appendChild(confirmAltBtn);

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

    menu.appendChild(altBtn);
    menu.appendChild(vnode.state.altInputContainer);
    menu.appendChild(leftBtn);
    menu.appendChild(centerBtn);
    menu.appendChild(rightBtn);
    menu.appendChild(deleteBtn);

    // Guardar referencia en el estado del vnode
    vnode.state.imageBubbleMenuElement = menu;

    return menu;
}

function initTiptapEditor(vnode, container) {
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
            // Menú para Enlaces (crear y editar)
            BubbleMenu.configure({
                pluginKey: 'linkMenu',
                element: createLinkBubbleMenu(vnode),
                shouldShow: ({ editor, state }) => {
                    // Mostrar si hay link activo O si hay texto seleccionado
                    const { from, to } = state.selection;
                    const hasSelection = from !== to;
                    // Actualizar botones antes de mostrar
                    if (vnode.state.updateLinkMenuButtons) {
                        vnode.state.updateLinkMenuButtons();
                    }
                    return editor.isActive('link') || hasSelection;
                },
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
            // Si estamos cambiando de idioma, ignorar este evento para evitar bucles
            if (vnode.state.isSwitchingLang) return;

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
                    updateValue(vnode, newTranslations);
                } else {
                    updateValue(vnode, html);
                }
            }
        },
        onSelectionUpdate: () => {
            // Actualizar botones del menú de enlace si existe
            if (vnode.state.updateLinkMenuButtons) {
                vnode.state.updateLinkMenuButtons();
            }
        },
        onFocus: () => {
            vnode.state.isFocused = true;
            // No hacer redraw - Mithril redibuja automáticamente cuando attrs/state cambian
        },
        onBlur: () => {
            vnode.state.isFocused = false;
            // No hacer redraw - Mithril redibuja automáticamente cuando attrs/state cambian
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
        theme: 'none',
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
        // Si estamos cambiando de idioma, ignorar este evento para evitar bucles
        if (vnode.state.isSwitchingLang) return;

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
            updateValue(vnode, JSON.stringify(newTranslations));
        } else {
            updateValue(vnode, val);
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
        // Guardar si el formato original era JSON para preservarlo al guardar
        vnode.state.wasJsonFormat = typeof rawExternal === 'string' && rawExternal.trim().startsWith('{');

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
        vnode.state.isSwitchingLang = 0; // Contador para evitar bucles al cambiar de idioma (0=normal, >0=cambiando)
        vnode.state.langDropdownCloseHandler = null; // Referencia al handler de cierre
    },

    onremove: (vnode) => {
        // Limpiar timeout de debounce
        if (vnode.state.typingTimeout) {
            clearTimeout(vnode.state.typingTimeout);
            vnode.state.typingTimeout = null;
        }
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

        // Limpiar listener del dropdown de idiomas
        if (vnode.state.langDropdownCloseHandler) {
            document.removeEventListener('click', vnode.state.langDropdownCloseHandler);
            vnode.state.langDropdownCloseHandler = null;
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
            // CLAVE: Si el editor tiene el foco, el contenido es del usuario - NO tocar
            if (vnode.state.isFocused) {
                return;
            }

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
            const isDrastic = sizeDiff > 80;

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

        // 2. Botones de Multidioma (DROPDOWN)
        if (isMultiLangMode) {
            // Botón que abre el dropdown de multilingüe
            rightGroup.push(
                m('div', { style: 'position: relative;' }, [
                    m('button', {
                        type: 'button',
                        class: `native-rich-editor__button native-rich-editor__button--lang-active${vnode.state.langDropdownOpen ? ' is-active' : ''}`,
                        title: 'Cambiar idioma',
                        'aria-expanded': vnode.state.langDropdownOpen,
                        'aria-haspopup': 'listbox',
                        'aria-label': 'Cambiar idioma, actualmente ' + getLangName(activeLang),
                        onclick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            vnode.state.langDropdownOpen = !vnode.state.langDropdownOpen;
                            m.redraw();
                        }
                    }, [
                        m('span', { class: 'lang-dropdown-label' }, getLangName(activeLang)),
                        m('span', {
                            class: 'lang-dropdown-arrow',
                            style: vnode.state.langDropdownOpen
                                ? 'margin-left: 0.25rem; font-size: 0.7rem; transform: rotate(180deg);'
                                : 'margin-left: 0.25rem; font-size: 0.7rem;'
                        }, '▼')
                    ]),
                    // Dropdown
                    vnode.state.langDropdownOpen ? m('div', {
                        class: 'native-rich-editor__lang-dropdown',
                        role: 'listbox',
                        'aria-label': 'Seleccionar idioma',
                        oncreate: (vnode2) => {
                            // Posicionar el dropdown debajo del botón toggle
                            const toggleBtn = vnode2.dom.previousElementSibling;
                            if (toggleBtn) {
                                const rect = toggleBtn.getBoundingClientRect();
                                vnode2.dom.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                                vnode2.dom.style.left = rect.left + 'px';
                            }
                            // Cerrar dropdown si se hace clic fuera (usando capture phase para detectar antes)
                            // Guardar referencia en variable local para que la función pueda referirse a sí misma
                            let closeHandler = null;
                            closeHandler = (event) => {
                                if (!vnode2.dom.contains(event.target)) {
                                    vnode.state.langDropdownOpen = false;
                                    if (closeHandler) {
                                        document.removeEventListener('click', closeHandler, true);
                                    }
                                    vnode.state.langDropdownCloseHandler = null;
                                    m.redraw();
                                }
                            };
                            vnode.state.langDropdownCloseHandler = closeHandler;
                            // Usar bubble phase (false) para que el onclick del botón se ejecute primero
                            document.addEventListener('click', closeHandler, false);
                        },
                        onremove: () => {
                            // Limpiar listener al remover el dropdown del DOM
                            if (vnode.state.langDropdownCloseHandler) {
                                document.removeEventListener('click', vnode.state.langDropdownCloseHandler, false);
                                vnode.state.langDropdownCloseHandler = null;
                            }
                        }
                    }, [
                        m('div', { class: 'native-rich-editor__lang-dropdown-header' }, [
                            m('span', {}, 'Idioma: ' + getLangName(activeLang))
                        ]),
                        m('div', { class: 'native-rich-editor__lang-dropdown-buttons' }, [
                            // Botones de idioma
                            (() => {
                                const langButtons = [];
                                SUPPORTED_LANGS.forEach(lang => {
                                    const isCurrentLang = lang === activeLang;
                                    langButtons.push(
                                        m('button', {
                                            type: 'button',
                                            role: 'option',
                                            class: `native-rich-editor__button${isCurrentLang ? ' is-active' : ''}`,
                                            'aria-selected': isCurrentLang,
                                            title: getLangName(lang),
                                            onclick: (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rawExternal = getRawExternalValue(vnode.state.getAttrs ? vnode.state.getAttrs() : vnode.attrs);
                                                const { translations } = normalizeToTranslations(rawExternal);
                                                const newValue = translations[lang] || '';

                                                // Incrementar contador en lugar de boolean
                                                vnode.state.isSwitchingLang++;
                                                vnode.state.currentLang = lang;
                                                vnode.state.lastExternalValue = newValue;
                                                vnode.state.lastEmittedValue = newValue;
                                                vnode.state.langDropdownOpen = false;

                                                if (vnode.state.isSourceView && vnode.state.codeMirrorEditor) {
                                                    vnode.state.sourceValue = newValue;
                                                    vnode.state.codeMirrorEditor.setValue(newValue);
                                                } else if (vnode.state.tiptapEditor) {
                                                    vnode.state.tiptapEditor.commands.setContent(newValue);
                                                }
                                                m.redraw();

                                                // Decrementar contador después de un delay mayor
                                                setTimeout(() => {
                                                    vnode.state.isSwitchingLang--;
                                                    if (vnode.state.isSwitchingLang < 0) vnode.state.isSwitchingLang = 0;
                                                }, 100);
                                            }
                                        }, [
                                            m('span', { class: 'native-rich-editor__button-icon' }, lang.toUpperCase()),
                                            m('span', { class: 'button-text' }, getLangName(lang))
                                        ])
                                    );
                                });
                                return langButtons;
                            })(),
                            // Separador
                            m('div', { class: 'separator' }),
                            // Botón: Traducir ES -> VA con API SALT
                            m('button', {
                                type: 'button',
                                class: 'native-rich-editor__button native-rich-editor__button--translate',
                                title: 'Traducir al valenciano (SALT)',
                                onclick: async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const rawExternal = getRawExternalValue(vnode.state.getAttrs ? vnode.state.getAttrs() : vnode.attrs);
                                    const { translations } = normalizeToTranslations(rawExternal);
                                    const textToTranslate = translations['es'] || translations['und'] || '';

                                    if (translations['va'] && translations['va'].trim() !== '') {
                                        // Mostrar mensaje de error con delay para evitar bloqueos
                                        setTimeout(() => {
                                            vnode.state.langDropdownOpen = false;
                                            m.redraw();
                                            alert('Ya existe una traducción al valenciano. Por favor borra la existente antes de continuar.');
                                        }, 100);
                                        return;
                                    }

                                    if (!textToTranslate || textToTranslate.trim() === '') {
                                        setTimeout(() => {
                                            vnode.state.langDropdownOpen = false;
                                            m.redraw();
                                            alert('No hay texto que traducir.');
                                        }, 100);
                                        return;
                                    }

                                    // Confirmar con un flujo menos intrusivo
                                    vnode.state.langDropdownOpen = false;
                                    m.redraw();

                                    const confirmed = confirm('¿Seguro que deseas traducir este texto al valenciano?');
                                    if (!confirmed) return;

                                    const translatedText = await translateSALT(textToTranslate);

                                    if (translatedText && !translatedText.startsWith('ERROR')) {
                                        const newTranslations = { ...translations, va: translatedText };
                                        vnode.state.isMultiLang = true;
                                        vnode.state.currentLang = 'va';
                                        vnode.state.lastEmittedValue = translatedText;
                                        updateValue(vnode, newTranslations);
                                        m.redraw();
                                        setTimeout(() => {
                                            alert('Traducción completada al valenciano.');
                                        }, 100);
                                    } else {
                                        alert('Error al traducir el texto. Inténtalo de nuevo.');
                                    }
                                }
                            }, [
                                m.trust(ICONS.translate),
                                m('span', { class: 'button-text' }, 'Traducir al valenciano')
                            ]),
                            // Separador
                            m('div', { class: 'separator' }),
                            // Botón: De Multidioma a Texto Simple
                            m('button', {
                                type: 'button',
                                class: 'native-rich-editor__button native-rich-editor__button--close-lang',
                                title: 'Desactivar traducción (Modo texto)',
                                onclick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
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

                                    vnode.state.langDropdownOpen = false;
                                    m.redraw();

                                    if (filledLangs === 0) {
                                        vnode.state.isMultiLang = false;
                                        updateValue(vnode, '');
                                    } else if (filledLangs === 1) {
                                        const confirmed = confirm('¿Convertir a texto único? El contenido en ' + filledLangName + ' se mantendrá.');
                                        if (confirmed) {
                                            vnode.state.isMultiLang = false;
                                            updateValue(vnode, vnode.state.lastEmittedValue);
                                        }
                                    } else {
                                        alert('No se puede convertir a texto único porque hay contenido en varios idiomas (' + filledLangs + '). Traduce primero los demás idiomas.');
                                    }
                                }
                            }, [
                                m.trust(ICONS.close),
                                m('span', { class: 'button-text' }, 'Desactivar multilingüe')
                            ])
                        ])
                    ]) : null
                ])
            );
        } else {
            // Botón: De Texto Simple a Multidioma (Bola del mundo)
            rightGroup.push(
                m('button', {
                    type: 'button',
                    class: 'native-rich-editor__button native-rich-editor__button--lang-inactive',
                    title: 'Activar traducción multilingüe',
                    'aria-label': 'Activar traducción multilingüe',
                    onclick: (e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Evitar que el listener del document cierre el dropdown
                        const targetLang = 'es'; // Por defecto español
                        vnode.state.isMultiLang = true;
                        vnode.state.currentLang = targetLang;
                        vnode.state.langDropdownOpen = true;
                        const currentVal = vnode.state.lastEmittedValue || '';
                        const multiLangValue = {};
                        SUPPORTED_LANGS.forEach(lang => {
                            multiLangValue[lang] = (lang === targetLang) ? currentVal : '';
                        });
                        updateValue(vnode, multiLangValue);
                    }
                }, [
                    m('span', { class: 'lang-inactive-text' }, 'Idioma'),
                    m('span', {
                        class: 'lang-inactive-icon',
                        'aria-hidden': 'true',
                        style: 'margin-left: 0.25rem;'
                    }, '🌍')
                ])
            );
        }

        // 3. ESTRUCTURA FINAL (Corregido: Con Keys)
        return m('div', {
            style: "width: 100%",
            class: `native-rich-editor${isSourceView ? ' native-rich-editor--source' : ''}`
        }, [
            // Bloque A: Toolbar con grupos de botones
            m('div', { class: 'native-rich-editor__toolbar', role: 'toolbar' }, [
                m('div', { style: 'display: flex; gap: 0.25rem; align-items: center; flex-wrap: wrap;' }, leftGroup),
                m('div', { style: 'flex: 1;' }), // Espaciador que empuja
                m('div', { style: 'display: flex; gap: 0.25rem; align-items: center; flex-wrap: wrap;' }, rightGroup)
            ]),

            // Bloque B: CONTENEDOR AISLADO PARA LOS EDITORES (Soluciona el crasheo)
            // Al meter los elementos con Key dentro de su propio contenedor exclusivo, Mithril no se confunde
            m('div', { class: 'native-rich-editor__body-wrapper', style: 'position: relative;' }, [
                isSourceView
                ? m('div', {
                    id: 'codemirror-container-' + vnode.state.editorId,
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
