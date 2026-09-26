import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface OverrideConflictDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Aviso previo (regla no negociable #8, pero antes del hecho): este ajuste dejaría huérfano
 * un capítulo con una edición manual guardada — nunca se aplica sin que el usuario lo confirme. */
export function OverrideConflictDialog({ open, onConfirm, onCancel }: OverrideConflictDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogTitle className="text-[15px] font-semibold text-text">Este cambio puede afectar una edición manual</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-[13px] text-text-muted">
          Al menos un capítulo tiene una corrección manual guardada. Este ajuste podría hacer que ese capítulo ya no
          coincida con ningún capítulo actual — la edición no se borra, pero quedaría huérfana y convendría revisarla.
        </AlertDialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={onConfirm}>
            Aplicar de todos modos
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
