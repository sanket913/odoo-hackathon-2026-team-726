import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Field, Input, Select, Textarea, Button, Modal } from './ui'

describe('Shared form controls', () => {
  it('preserves registered values and submits existing defaults after reset', async () => {
    const save = vi.fn()
    function Form() {
      const { register, handleSubmit, reset } = useForm({ defaultValues: { name: 'Existing employee', type: 'regular', notes: 'Existing notes' } })
      return <form onSubmit={handleSubmit(save)}>
        <Field label="Full name"><Input {...register('name')} /></Field>
        <Field label="Type"><Select {...register('type')}><option value="regular">Regular</option><option value="contractor">Contractor</option></Select></Field>
        <Field label="Notes"><Textarea {...register('notes')} /></Field>
        <Button type="button" onClick={() => reset({ name: 'Loaded employee', type: 'contractor', notes: 'Loaded notes' })}>Load record</Button>
        <Button type="submit">Save</Button>
      </form>
    }
    render(<Form />)
    expect(screen.getByLabelText('Full name')).toHaveValue('Existing employee')
    fireEvent.click(screen.getByText('Load record'))
    expect(screen.getByLabelText('Type')).toHaveValue('contractor')
    expect(screen.getByLabelText('Notes')).toHaveValue('Loaded notes')
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Edited employee' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0]).toEqual({ name: 'Edited employee', type: 'contractor', notes: 'Loaded notes' })
  })

  it('exposes the DOM ref and links validation errors to the input', () => {
    const ref = createRef()
    render(<Field label="Email" error="Invalid email"><Input ref={ref} /></Field>)
    const input = screen.getByLabelText('Email')
    expect(ref.current).toBe(input)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Invalid email')
  })
})

describe('Modal accessibility', () => {
  it('labels the dialog, closes with Escape and restores focus and scrolling', () => {
    const close = vi.fn()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const { rerender } = render(<Modal open onClose={close} title="Edit roles"><Button>Save</Button></Modal>)
    expect(screen.getByRole('dialog', { name: 'Edit roles' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(close).toHaveBeenCalledOnce()
    rerender(<Modal open={false} onClose={close} title="Edit roles" />)
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).not.toBe('hidden')
    trigger.remove()
  })
})
