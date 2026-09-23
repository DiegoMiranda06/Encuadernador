import type { ValidationReport as ValidationReportData } from '@/epub/validate'

interface ValidationReportProps {
  report: ValidationReportData
}

export function ValidationReport({ report }: ValidationReportProps) {
  const { errors, warnings } = report

  if (errors.length === 0 && warnings.length === 0) {
    return <p className="text-[13px] text-success">Pasó las ocho comprobaciones sin errores ni avisos.</p>
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-destructive">Errores ({errors.length}) — bloquean la descarga</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-warning">Avisos ({warnings.length})</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-warning">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
