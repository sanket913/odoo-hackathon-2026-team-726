import { cloneElement, useId } from 'react'

export function FilterToolbar({ children, label = 'Search and filters', className = '' }) {
  return <section aria-label={label} className={`o_search_panel pp-filter-toolbar ${className}`}>{children}</section>
}

export function FilterField({ label, children, className = '' }) {
  const generatedId = useId()
  const id = children.props.id || generatedId
  return <div className={`pp-filter-field ${className}`}><label className="o_label" htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>
}
