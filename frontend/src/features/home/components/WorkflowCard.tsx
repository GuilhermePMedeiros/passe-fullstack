import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

export interface WorkflowStep {
  title: string
  description: string
  to: string
  icon: LucideIcon
}

export function WorkflowCard({ step, number }: { step: WorkflowStep; number: number }) {
  const Icon = step.icon
  
  return (
    <li className="workflow-step">
      <Link className="workflow-card" to={step.to}>
       
        <div className="workflow-card-heading">
          <span className="workflow-icon"><Icon aria-hidden="true" /></span>
          <span className="workflow-number">{String(number).padStart(2, '0')}</span>
        </div>
        
        <h2>{step.title}</h2>
        <p>{step.description}</p>
      
      </Link>
      
      <ChevronRight className="workflow-chevron" aria-hidden="true" />
    
    </li>
  )
}
