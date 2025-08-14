import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '@/components/Sidebar'
import { useSidebarStore } from '@/stores/sidebarStore'

describe('Sidebar', () => {
  beforeEach(() => {
    useSidebarStore.setState({
      isOpen: true,
      activeTab: 1,
      tools: [
        { id: '1', name: 'Measure', type: 'tool', imageName: 'measure.png', enabled: true },
      ] as any,
      themes: [],
    })
  })

  it('renders tools tab and allows item click', () => {
    render(<Sidebar />)
    const tool = screen.getByText('Measure')
    fireEvent.click(tool)
    // Active tool should be set in store
    expect(useSidebarStore.getState().activeTool).toBe('Measure')
  })
})



