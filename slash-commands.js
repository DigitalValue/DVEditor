/**
 * Slash Commands extension for Tiptap
 * Detecta "/" y muestra un menú de comandos
 */

import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

// Lista de comandos disponibles
export const slashCommandsList = [
    {
        title: 'Encabezado 1',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
        },
        icon: 'H1',
        alias: ['h1', 'heading', 'título'],
    },
    {
        title: 'Encabezado 2',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
        },
        icon: 'H2',
        alias: ['h2', 'subheading'],
    },
    {
        title: 'Párrafo',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setParagraph().run();
        },
        icon: 'P',
        alias: ['p', 'paragraph', 'texto'],
    },
    {
        title: 'Lista con viñetas',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
        icon: '•',
        alias: ['ul', 'bullet', 'viñetas'],
    },
    {
        title: 'Lista numerada',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
        icon: '1.',
        alias: ['ol', 'ordered', 'numérica'],
    },
    {
        title: 'Cita',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
        icon: '❝',
        alias: ['quote', 'blockquote', 'cita'],
    },
    {
        title: 'Código',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
        icon: '</>',
        alias: ['code', 'pre', 'código'],
    },
    {
        title: 'Línea horizontal',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
        icon: '—',
        alias: ['hr', 'line', 'línea'],
    },
    {
        title: 'Tabla',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
        icon: '▦',
        alias: ['table', 'tabla'],
    },
];

// Render function para el menú de sugerencias
export const renderSlashCommands = () => {
    let component = null;
    let popup = null;

    return {
        onStart: (props) => {
            const { editor, clientRect } = props;

            // Crear elemento del menú
            const container = document.createElement('div');
            container.className = 'slash-commands-menu';
            container.style.cssText = `
                position: absolute;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 8px 0;
                min-width: 180px;
                max-height: 300px;
                overflow-y: auto;
                z-index: 1000;
            `;

            // Filtrar comandos según la búsqueda
            const query = props.query || '';
            const filteredCommands = slashCommandsList.filter(cmd => {
                if (!query) return true;
                const searchText = (cmd.title + ' ' + cmd.alias.join(' ')).toLowerCase();
                return searchText.includes(query.toLowerCase());
            });

            // Renderizar comandos
            filteredCommands.forEach((cmd, index) => {
                const item = document.createElement('div');
                item.className = 'slash-command-item';
                item.dataset.index = index;
                item.style.cssText = `
                    padding: 8px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    color: #333;
                `;
                item.innerHTML = `
                    <span style="
                        width: 24px;
                        height: 24px;
                        background: #f1f5f9;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                        color: #64748b;
                    ">${cmd.icon}</span>
                    <span>${cmd.title}</span>
                `;

                item.addEventListener('mouseenter', () => {
                    container.querySelectorAll('.slash-command-item').forEach(i => i.style.background = 'transparent');
                    item.style.background = '#f1f5f9';
                });

                item.addEventListener('click', () => {
                    cmd.command({ editor, range: props.range });
                });

                container.appendChild(item);
            });

            // Posicionar el menú
            if (clientRect) {
                container.style.top = `${clientRect().bottom + window.scrollY}px`;
                container.style.left = `${clientRect().left + window.scrollX}px`;
            }

            document.body.appendChild(container);
            component = container;

            // Keyboard navigation
            container.addEventListener('keydown', (e) => {
                const items = container.querySelectorAll('.slash-command-item');
                const activeIndex = Array.from(items).findIndex(i => i.style.background !== 'transparent');

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = (activeIndex + 1) % items.length;
                    items.forEach(i => i.style.background = 'transparent');
                    items[next].style.background = '#f1f5f9';
                    items[next].scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = (activeIndex - 1 + items.length) % items.length;
                    items.forEach(i => i.style.background = 'transparent');
                    items[prev].style.background = '#f1f5f9';
                    items[prev].scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeIndex >= 0) {
                        items[activeIndex].click();
                    }
                } else if (e.key === 'Escape') {
                    if (props.callbacks && props.callbacks.exit) {
                        props.callbacks.exit();
                    }
                }
            });
        },

        onUpdate: (props) => {
            if (!component) return;

            const query = props.query || '';
            const filteredCommands = slashCommandsList.filter(cmd => {
                if (!query) return true;
                const searchText = (cmd.title + ' ' + cmd.alias.join(' ')).toLowerCase();
                return searchText.includes(query.toLowerCase());
            });

            component.innerHTML = '';

            filteredCommands.forEach((cmd, index) => {
                const item = document.createElement('div');
                item.className = 'slash-command-item';
                item.style.cssText = `
                    padding: 8px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    color: #333;
                `;
                item.innerHTML = `
                    <span style="
                        width: 24px;
                        height: 24px;
                        background: #f1f5f9;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                        color: #64748b;
                    ">${cmd.icon}</span>
                    <span>${cmd.title}</span>
                `;

                item.addEventListener('mouseenter', () => {
                    component.querySelectorAll('.slash-command-item').forEach(i => i.style.background = 'transparent');
                    item.style.background = '#f1f5f9';
                });

                item.addEventListener('click', () => {
                    cmd.command({ editor: props.editor, range: props.range });
                });

                component.appendChild(item);
            });
        },

        onExit: () => {
            if (component) {
                component.remove();
                component = null;
            }
        },

        onKeyDown: (props) => {
            if (props.event.key === 'Escape') {
                if (component) {
                    component.remove();
                    component = null;
                }
                return true;
            }
            return false;
        },
    };
};

export default SlashCommands;
