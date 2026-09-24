import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import Heading from '@tiptap/extension-heading'
import History from '@tiptap/extension-history'
import Italic from '@tiptap/extension-italic'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { EditorToolbar } from './EditorToolbar'

// El mismo esquema restringido que sanitizeChapterHtml() exige al guardar (lib/sanitize.ts) —
// lo que el editor no puede producir, tampoco hace falta permitirlo al persistir.
const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Heading.configure({ levels: [1, 2, 3] }),
  Bold,
  Italic,
  Blockquote,
  BulletList,
  OrderedList,
  ListItem,
  HardBreak,
  History,
]

interface ChapterEditorProps {
  initialHtml: string
  onSave: (html: string) => void
  onCancel: () => void
  isSaving: boolean
}

export function ChapterEditor({ initialHtml, onSave, onCancel, isSaving }: ChapterEditorProps) {
  const editor = useEditor({ extensions: EXTENSIONS, content: initialHtml, immediatelyRender: false })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      if (!isSaving && editor) onSave(editor.getHTML())
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor, isSaving, onSave])

  return (
    <div className="flex h-full flex-col">
      {editor && <EditorToolbar editor={editor} />}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border p-3 font-serif text-[16px] [&_.tiptap]:outline-none">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button disabled={isSaving || !editor} onClick={() => editor && onSave(editor.getHTML())}>
          Guardar
        </Button>
      </div>
    </div>
  )
}
