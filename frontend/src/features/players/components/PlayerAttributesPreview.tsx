import { ChartBar } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { ATTRIBUTES, type AttributeKey } from '../types/player.types'

interface AttributesPreviewProps {
  values: Record<AttributeKey, string | number>
  potential?: string | number
  preview?: boolean
}

export function PlayerAttributesPreview({ values, potential, preview = false }: AttributesPreviewProps) {
  const validAttributes = ATTRIBUTES.every(({ key }) => values[key] !== '' && Number.isInteger(Number(values[key])) && Number(values[key]) >= 1 && Number(values[key]) <= 99)
  const validPotential = potential !== '' && Number.isInteger(Number(potential)) && Number(potential) >= 1 && Number(potential) <= 99
  const hasValues = ATTRIBUTES.some(({ key }) => values[key] !== '') || Boolean(potential)

  if (preview && (!validAttributes || !validPotential)) {
    return (
      <section className="attributes-preview is-preview" aria-label="Indicadores técnicos">
        <p className="preview-title"><ChartBar aria-hidden="true" /> Prévia dos atributos</p>
        <p className="preview-placeholder">{hasValues ? 'Corrija os valores destacados para ver a prévia.' : 'Informe os indicadores para ver a prévia.'}</p>
      </section>
    )
  }

  return (
    <section className={`attributes-preview ${preview ? 'is-preview' : ''}`} aria-label="Indicadores técnicos">
      {preview && <p className="preview-title"><ChartBar aria-hidden="true" /> Prévia dos atributos</p>}
      {ATTRIBUTES.map(({ key, label }) => {
        const value = Number(values[key])
        const valid = values[key] !== '' && Number.isInteger(value) && value >= 1 && value <= 99

        return (
          <div className="attribute-row" key={key}>
            <span>{label}</span>
            <div className="attribute-track" style={{ '--potential': `${Math.min(99, Math.max(0, Number(potential) || 0)) / 99 * 100}%` } as React.CSSProperties}>
              <Progress max={99} value={valid ? value : 0} aria-label={label} />
            </div>
            <span>{valid ? value : '—'}</span>
          </div>
        )
      })}
      <p className="preview-note">{preview ? 'A prévia só desenha os valores digitados; não calcula overall nem valor base.' : <><span className="attribute-legend-value">Valor do atributo</span><span className="attribute-legend-potential">Até o potencial ({potential ?? '—'}), que nenhum atributo passa.</span></>}</p>
    </section>
  )
}
