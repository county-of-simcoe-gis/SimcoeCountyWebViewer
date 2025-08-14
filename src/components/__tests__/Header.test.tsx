import { render, screen, fireEvent } from '@testing-library/react'
import Header from '@/components/Header'
import { useSidebarStore } from '@/stores/sidebarStore'

describe('Header', () => {
  it('toggles sidebar on burger click', () => {
    useSidebarStore.setState({ isOpen: true })
    render(<Header />)
    const button = screen.getByRole('button', { name: /toggle sidebar/i })
    fireEvent.click(button)
    expect(useSidebarStore.getState().isOpen).toBe(false)
  })
})



