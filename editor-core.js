/**
 * editor-core.js
 * Nucleo del editor: constantes y funciones de parsing multidioma.
 * Las funciones de sanitizacion y manipulacion de DOM se manejan en index.js
 */

// ============================================
// CONSTANTES
// ============================================

export const ICONS = {
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    bold: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>',
    italic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>',
    underline: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>',
    h1: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 12l-5-5"/><path d="M16 12v6"/></svg>',
    h2: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>',
    quote: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>',
    list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
    ordered: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>',
    link: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    code: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    alignLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>',
    alignCenter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>',
    alignRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="17" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="17" y2="18"></line></svg>',
    table: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="3"></line></svg>',
    arrowUp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',
    arrowDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
    arrowLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
    arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    paragraph: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="15" y2="18"></line></svg>',
    bulletList: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="4" cy="6" r="1" fill="currentColor"></circle><circle cx="4" cy="12" r="1" fill="currentColor"></circle><circle cx="4" cy="18" r="1" fill="currentColor"></circle></svg>',
    orderedList: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>'
};

export const TOOLBAR_COMMANDS = [
    { id: 'bold', icon: 'bold', command: 'bold', title: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: 'italic', command: 'italic', title: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: 'underline', command: 'underline', title: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'h1', icon: 'h1', command: 'formatBlock', args: { tagName: 'h1' }, title: 'Encabezado 1' },
    { id: 'h2', icon: 'h2', command: 'formatBlock', args: { tagName: 'h2' }, title: 'Encabezado 2' },
    { id: 'quote', icon: 'quote', command: 'formatBlock', args: { tagName: 'blockquote' }, title: 'Cita' },
    { id: 'list', icon: 'list', command: 'insertUnorderedList', title: 'Lista' },
    { id: 'ordered', icon: 'ordered', command: 'insertOrderedList', title: 'Lista numerada' },
    { id: 'link', icon: 'link', command: 'link', title: 'Enlace', shortcut: 'Ctrl+K' },
    { id: 'image', icon: 'image', command: 'image', title: 'Imagen' },
    { id: 'table', icon: 'table', command: 'table', title: 'Tabla' },
    { id: 'source', icon: 'code', command: 'source', title: 'Ver codigo fuente' }
];

export const DEFAULT_TOOLBAR_COMMAND = TOOLBAR_COMMANDS.map(cmd => cmd.id);

export const SLASH_COMMANDS = [
    { id: 'h1', label: 'Encabezado 1', keywords: ['h1', 'heading1', 'heading', 'encabezado1', 'titulo1', 'titulo'], type: 'formatBlock', value: 'h1', iconKey: 'h1', description: 'Titulo grande' },
    { id: 'h2', label: 'Encabezado 2', keywords: ['h2', 'heading2', 'encabezado2', 'titulo2', 'subtitulo'], type: 'formatBlock', value: 'h2', iconKey: 'h2', description: 'Titulo mediano' },
    { id: 'paragraph', label: 'Parrafo', keywords: ['p', 'paragraph', 'texto', 'normal'], type: 'formatBlock', value: 'p', iconKey: 'paragraph', description: 'Texto normal' },
    { id: 'unordered', label: 'Lista con vinetas', keywords: ['ul', 'list', 'bullet', 'vineta', 'lista'], type: 'command', command: 'insertUnorderedList', iconKey: 'bulletList', description: 'Lista con vinetas' },
    { id: 'ordered', label: 'Lista numerada', keywords: ['ol', 'ordered', 'numerada', 'numero'], type: 'command', command: 'insertOrderedList', iconKey: 'orderedList', description: 'Lista numerada' },
    { id: 'blockquote', label: 'Cita', keywords: ['quote', 'cita', 'blockquote', 'ectar'], type: 'formatBlock', value: 'blockquote', iconKey: 'quote', description: 'Cita o bloque de texto' },
    { id: 'pre', label: 'Codigo', keywords: ['code', 'pre', 'codigo', 'preformatted'], type: 'formatBlock', value: 'pre', iconKey: 'code', description: 'Bloque de codigo' },
    { id: 'image', label: 'Imagen', keywords: ['image', 'img', 'picture', 'foto'], type: 'command', command: 'image', iconKey: 'image', description: 'Insertar imagen' },
    { id: 'table', label: 'Tabla', keywords: ['table', 'tabla', 'grid'], type: 'command', command: 'table', iconKey: 'table', description: 'Insertar tabla 2x2' }
];

export const DEFAULT_LANG = 'und';
export const SUPPORTED_LANGS = ['es', 'va', 'und'];

export const STYLE_ELEMENT_ID = 'native-rich-editor-styles';

// ============================================
// FUNCIONES DE SEGURIDAD BASICAS
// ============================================

const SAFE_LINK_PATTERN = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;
const SAFE_IMAGE_PATTERN = /^(https?:|data:image\/|blob:|\/|\.\/|\.\.\/)/i;

export function sanitizeUrl(rawValue, type) {
    if (!rawValue) return null;
    const value = String(rawValue).trim();
    const lowerValue = value.toLowerCase();
    if (lowerValue.startsWith('javascript:')) return null;
    const pattern = type === 'image' ? SAFE_IMAGE_PATTERN : SAFE_LINK_PATTERN;
    return pattern.test(value) ? value : null;
}

// ============================================
// FUNCIONES DE NORMALIZACION (para CodeMirror legacy)
// ============================================

export function normalizeHtml(html) {
    if (!html) return '';
    return html
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}

export function formatHTML(htmlString) {
    if (!htmlString) return '';
    let formatted = htmlString
        .replace(/></g, '>\n<')
        .replace(/([a-z]="[^"]*")/g, '$1\n')
        .replace(/(<[a-z]+)/g, '\n$1');
    return formatted.trim();
}

// ============================================
// FUNCIONES DE PARSING MULTIDIOMA
// ============================================

export function getRawExternalValue(attrs) {
    if (!attrs) return '';
    if (typeof attrs === 'string') return attrs;
    return attrs.value || '';
}

export function normalizeToTranslations(raw) {
    if (!raw) return { isMulti: false, translations: { es: '', va: '' } };

    // Si es string, asume que es multilingue con JSON
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return { isMulti: true, translations: parsed };
            }
        } catch (e) {
            // Si no es JSON, es solo un string simple
            return { isMulti: false, translations: { es: raw, va: raw } };
        }
    }

    // Si ya es objeto
    if (raw && typeof raw === 'object') {
        return { isMulti: true, translations: raw };
    }

    return { isMulti: false, translations: { es: '', va: '' } };
}

export function getTextForLang(translations, lang) {
    if (!translations) return '';
    if (typeof translations === 'string') return translations;
    return translations[lang] || translations.es || '';
}

export function getExternalValue(vnode) {
    const attrs = vnode.attrs || {};
    const raw = getRawExternalValue(attrs);
    const { translations } = normalizeToTranslations(raw);
    return getTextForLang(translations, vnode.state.currentLang);
}

// ============================================
// FUNCIONES DE ESTADO
// ============================================

export function emitChange(vnode) {
    const { state } = vnode;
    if (state.pendingChange) {
        clearTimeout(state.pendingChange);
    }
    state.pendingChange = setTimeout(() => {
        delete state.pendingChange;
        if (vnode.attrs.onchange) {
            vnode.attrs.onchange(state.lastEmittedValue);
        }
    }, 0);
}

// Actualizar estado de botones de la toolbar
export function updateActiveState(state, editor = null) {
    if (!state.active) return;

    const tiptapEditor = editor || state.tiptapEditor;

    if (tiptapEditor) {
        TOOLBAR_COMMANDS.forEach(cmd => {
            const commandId = cmd.id;
            let isActive = false;

            switch (commandId) {
                case 'bold': isActive = tiptapEditor.isActive('bold'); break;
                case 'italic': isActive = tiptapEditor.isActive('italic'); break;
                case 'underline': isActive = tiptapEditor.isActive('underline'); break;
                case 'h1': isActive = tiptapEditor.isActive('heading', { level: 1 }); break;
                case 'h2': isActive = tiptapEditor.isActive('heading', { level: 2 }); break;
                case 'quote': isActive = tiptapEditor.isActive('blockquote'); break;
                case 'list': isActive = tiptapEditor.isActive('bulletList'); break;
                case 'ordered': isActive = tiptapEditor.isActive('orderedList'); break;
                case 'link': isActive = tiptapEditor.isActive('link'); break;
                case 'source': isActive = !!state.isSourceView; break;
                default: isActive = false;
            }

            state.active[commandId] = isActive;
        });
    } else {
        // Resetear todo si no hay editor
        TOOLBAR_COMMANDS.forEach(cmd => {
            state.active[cmd.id] = false;
        });
    }
}
