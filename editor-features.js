/**
 * editor-features.js
 * Funciones del editor - Simplificado para Tiptap
 */

import { ICONS, btn, emitChange, sanitizeUrl } from './editor-core.js';

// ============================================
// TOOLTIP
// ============================================

let tooltipElement = null;

function createTooltip() {
    if (tooltipElement) return tooltipElement;
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'native-rich-editor__tooltip';
    tooltipElement.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipElement);
    return tooltipElement;
}

function showTooltip(buttonElement, text) {
    if (!buttonElement || !text) return;
    const tooltip = createTooltip();
    tooltip.textContent = text;
    tooltip.style.display = 'block';

    const rect = buttonElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    const top = rect.top + scrollY - tooltipRect.height - 8;
    const left = rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2);

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}

function hideTooltip() {
    if (tooltipElement) tooltipElement.style.display = 'none';
}

function setupTooltip(buttonElement, label, shortcut) {
    if (!buttonElement) return;
    const tooltipText = shortcut ? `${label} (${shortcut})` : label;
    let showTimeout = null;
    buttonElement.addEventListener('mouseenter', () => {
        showTimeout = setTimeout(() => showTooltip(buttonElement, tooltipText), 300);
    });
    buttonElement.addEventListener('mouseleave', () => {
        clearTimeout(showTimeout);
        hideTooltip();
    });
}

// ============================================
// POPOVER DE ENLACES
// ============================================

let popoverElement = null;
let popoverInputElement = null;

function createPopover() {
    if (popoverElement) return popoverElement;
    popoverElement = document.createElement('div');
    popoverElement.className = 'native-rich-editor__popover';
    popoverElement.setAttribute('role', 'dialog');
    popoverElement.setAttribute('aria-label', 'Insertar enlace');
    popoverElement.style.display = 'none';
    document.body.appendChild(popoverElement);
    return popoverElement;
}

function showPopover(x, y, initialValue = '', mode = 'edit', linkNode = null) {
    // Simplificado - ya no se usa activamente con Tiptap
    const popover = createPopover();
    popover.style.display = 'block';
}

function hidePopover() {
    if (popoverElement) popoverElement.style.display = 'none';
}

function handleLinkClick(vnode, event, linkElement) {
    event.preventDefault();
    event.stopPropagation();
    // Simplificado - ya no se usa activamente
}

function setupPopoverViewHandlers(vnode) {}
function setupPopoverEditHandlers(vnode, isEditingExisting = false) {}
function applyLink(vnode) {}

// ============================================
// IMÁGENES
// ============================================

let imageFileInput = null;

function createImageOverlay() { return null; }
function createImageToolbar() { return null; }

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

function insertImageContent(vnode, src) {
    const editor = vnode.state.tiptapEditor;
    if (editor) {
        editor.chain().focus().setImage({ src }).run();
    }
}

// ============================================
// TABLAS
// ============================================

let tableToolbarElement = null;

function applyTable(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
}

function createTableToolbar() {
    if (tableToolbarElement) return tableToolbarElement;
    tableToolbarElement = document.createElement('div');
    tableToolbarElement.className = 'native-rich-editor__table-toolbar';
    tableToolbarElement.setAttribute('role', 'toolbar');
    tableToolbarElement.setAttribute('aria-label', 'Tabla');
    tableToolbarElement.style.display = 'none';
    document.body.appendChild(tableToolbarElement);
    return tableToolbarElement;
}

function showTableToolbar(vnode) {
    // Tiptap maneja tablas internamente
}

function hideTableToolbar(vnode) {
    if (tableToolbarElement) tableToolbarElement.style.display = 'none';
}

function getCellPosition(cellElement) { return { row: 0, cellIndex: 0 }; }
function setSelectionToCell(vnode, cellElement) {}
function insertRowAbove(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) { editor.chain().focus().addRowBefore().run(); emitChange(vnode); }
}
function insertRowBelow(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) { editor.chain().focus().addRowAfter().run(); emitChange(vnode); }
}
function insertColLeft(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) { editor.chain().focus().addColumnBefore().run(); emitChange(vnode); }
}
function insertColRight(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) { editor.chain().focus().addColumnAfter().run(); emitChange(vnode); }
}
function deleteRow(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) { editor.chain().focus().deleteRow().run(); emitChange(vnode); }
}
function deleteCol(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) { editor.chain().focus().deleteColumn().run(); emitChange(vnode); }
}
function deleteTable(vnode) {
    const editor = vnode.state.tiptapEditor;
    if (editor) { editor.chain().focus().deleteTable().run(); emitChange(vnode); }
}
function setupTableToolbarHandlers(vnode) {}
function handleTableCellClick(vnode, event, cellElement) {}
function handleTableKeyboardNavigation(vnode, event) {}

// ============================================
// SLASH COMMANDS (simplificado - ya no se usa activamente)
// ============================================

function hasImageFiles(files) { return files && files.length > 0; }
function handleDragOver(e) { e.preventDefault(); }
function handleDragEnter(e) { e.preventDefault(); }
function handleDragLeave(e) {}
function createSlashMenu() { return null; }
function getFilteredSlashCommands(query) { return []; }
function renderSlashMenu() { return null; }
function showSlashMenu() {}
function hideSlashMenu() {}
function applySlashCommand(vnode, command) {
    const editor = vnode.state.tiptapEditor;
    if (!editor) return;
    const from = editor.state.selection.from;
    if (command.command === 'formatBlock') {
        if (command.args.tagName === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
        else if (command.args.tagName === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
        else if (command.args.tagName === 'p') editor.chain().focus().setParagraph().run();
    } else if (command.command === 'insertUnorderedList') {
        editor.chain().focus().toggleBulletList().run();
    } else if (command.command === 'insertOrderedList') {
        editor.chain().focus().toggleOrderedList().run();
    } else if (command.command === 'blockquote') {
        editor.chain().focus().toggleBlockquote().run();
    } else if (command.command === 'codeBlock') {
        editor.chain().focus().toggleCodeBlock().run();
    } else if (command.command === 'image') {
        createImageFileInput(vnode).click();
    } else if (command.command === 'table') {
        applyTable(vnode);
    }
    emitChange(vnode);
}
function isCursorAtStartOfLine() { return false; }
function getSlashCommandQuery() { return ''; }
function handleSlashCommandKeydown(vnode, event) { return false; }

// ============================================
// DRAG & DROP
// ============================================

function handleDrop(e) { e.preventDefault(); }

// ============================================
// EXPORTS
// ============================================

export {
    // Tooltip
    createTooltip, showTooltip, hideTooltip, setupTooltip,
    // Links
    createPopover, showPopover, hidePopover, handleLinkClick,
    setupPopoverViewHandlers, setupPopoverEditHandlers, applyLink,
    // Images
    createImageOverlay, createImageToolbar, createImageFileInput, insertImageContent,
    // Tables
    applyTable, createTableToolbar, showTableToolbar, hideTableToolbar,
    getCellPosition, setSelectionToCell,
    insertRowAbove, insertRowBelow, insertColLeft, insertColRight,
    deleteRow, deleteCol, deleteTable,
    setupTableToolbarHandlers, handleTableCellClick, handleTableKeyboardNavigation,
    // Slash Commands
    hasImageFiles, handleDragOver, handleDragEnter, handleDragLeave,
    createSlashMenu, getFilteredSlashCommands, renderSlashMenu,
    showSlashMenu, hideSlashMenu, applySlashCommand,
    isCursorAtStartOfLine, getSlashCommandQuery, handleSlashCommandKeydown,
    // Drag & Drop
    handleDrop
};
