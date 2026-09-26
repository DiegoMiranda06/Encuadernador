import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Italic from '@tiptap/extension-italic'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Text from '@tiptap/extension-text'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChapterAside } from './extensions/aside'
import { ChapterHeading } from './extensions/heading'
import { ChapterImage } from './extensions/image'
import { ChapterParagraph } from './extensions/paragraph'
import { EditorToolbar } from './EditorToolbar'

/** Tiempo sin escribir antes de autoguardar — bastante corto: la regla del proyecto es que
 * una edición manual nunca se pierde, así que conviene persistirla pronto. */
const AUTOSAVE_DELAY_MS = 1200

export type SaveStatus = 'saved' | 'dirty' | 'saving'

interface ChapterEditorProps {
  initialHtml: string
  onSave: (html: string) => Promise<void>
  onStatusChange?: (status: SaveStatus) => void
  /** Igual que renderChapterBody() — resuelve un assetId a la `blob:` URL que ya usa la preview. */
  resolveAssetHref: (assetId: string) => string | undefined
}

/**
 * Vista central editable — reemplaza el iframe de solo lectura y el Sheet modal del editor
 * (Paso "vista unificada" del rediseño). Autoguarda con debounce mientras se escribe, guarda
 * de inmediato con ⌘S/Ctrl+S, y guarda lo pendiente al desmontar (cambiar de capítulo o de
 * pantalla) — así una corrección nunca se pierde por no haber tocado un botón "Guardar".
 */
export function ChapterEditor({ initialHtml, onSave, onStatusChange, resolveAssetHref }: ChapterEditorProps) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const statusRef = useRef(status)
  const latestHtmlRef = useRef(initialHtml)
  const onSaveRef = useRef(onSave)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    statusRef.current = status
    onStatusChange?.(status)
  }, [status, onStatusChange])

  const extensions = useMemo(
    () => [
      Document,
      ChapterParagraph,
      Text,
      ChapterHeading.configure({ levels: [1, 2, 3] }),
      Bold,
      Italic,
      Blockquote,
      BulletList,
      OrderedList,
      ListItem,
      HardBreak,
      History,
      ChapterAside,
      ChapterImage.configure({ resolveHref: resolveAssetHref }),
    ],
    [resolveAssetHref],
  )

  async function flush() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')
    try {
      await onSaveRef.current(latestHtmlRef.current)
      setStatus('saved')
    } catch {
      // El toast de error lo muestra quien nos llama (tiene el contexto del capítulo) — acá
      // solo dejamos el estado visual en "dirty" para que se note que no quedó guardado.
      setStatus('dirty')
    }
  }

  const editor = useEditor({
    extensions,
    content: initialHtml,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      latestHtmlRef.current = editor.getHTML()
      setStatus('dirty')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS)
    },
  })

  // ⌘S / Ctrl+S guarda ya, sin esperar el debounce.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      void flush()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Al desmontar (cambiar de capítulo, salir de la pantalla) — si quedó algo sin guardar, se
  // manda ya. No espera la respuesta (el componente ya no está), pero el pedido sigue en pie.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (statusRef.current !== 'saved') void onSaveRef.current(latestHtmlRef.current)
    }
  }, [])

  return (
    <div className="mx-auto flex h-full w-full max-w-[760px] flex-col px-6 py-6">
      {editor && <EditorToolbar editor={editor} />}
      <div className="min-h-0 flex-1 overflow-y-auto font-serif text-[16px] leading-relaxed text-paper-text [&_.tiptap]:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
