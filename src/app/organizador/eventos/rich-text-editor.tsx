'use client';

import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

/** Editor de texto rico. O HTML vai num campo oculto e é sanitizado no servidor. */
export function RichTextEditor({ name, initialHtml }: { name: string; initialHtml: string }) {
  const [html, setHtml] = useState(initialHtml);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } })],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'rich-text min-h-48 px-3 py-2.5 outline-none',
        'aria-label': 'Descrição do evento',
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? '' : editor.getHTML()),
  });

  const buttons: { label: string; title: string; run: () => void; active: boolean }[] = editor
    ? [
        {
          label: 'N',
          title: 'Negrito',
          run: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive('bold'),
        },
        {
          label: 'I',
          title: 'Itálico',
          run: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive('italic'),
        },
        {
          label: 'Título',
          title: 'Título de seção',
          run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor.isActive('heading', { level: 2 }),
        },
        {
          label: '• Lista',
          title: 'Lista com marcadores',
          run: () => editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive('bulletList'),
        },
        {
          label: '1. Lista',
          title: 'Lista numerada',
          run: () => editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive('orderedList'),
        },
        {
          label: '“ Citação',
          title: 'Citação',
          run: () => editor.chain().focus().toggleBlockquote().run(),
          active: editor.isActive('blockquote'),
        },
      ]
    : [];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 bg-zinc-50 p-1.5" role="toolbar" aria-label="Formatação">
        {buttons.map((b) => (
          <button
            key={b.title}
            type="button"
            title={b.title}
            aria-pressed={b.active}
            onClick={b.run}
            className={`rounded px-2.5 py-1 text-sm ${b.active ? 'bg-brand-100 text-brand-700' : 'hover:bg-zinc-200'} ${
              b.label === 'N' ? 'font-bold' : b.label === 'I' ? 'italic' : ''
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
