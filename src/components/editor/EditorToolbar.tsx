import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function ToolbarButton({ label, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-sm border border-border px-2 py-1 text-[12px] transition-surface hover:bg-surface-2',
        active ? 'border-primary text-primary' : 'text-text-muted',
      )}
    >
      {label}
    </button>
  )
}

/** Esquema restringido: solo lo que sanitizeChapterHtml() deja pasar — ver lib/sanitize.ts. */
export function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      <ToolbarButton label="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton label="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton
        label="H1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label="H2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="H3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarButton label="Cita" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton
        label="Lista"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Lista numerada"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
    </div>
  )
}
