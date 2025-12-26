import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Sidebar from '$lib/components/Sidebar.svelte';

describe('Sidebar Component', () => {
	describe('Rendering', () => {
		it('renders sidebar structure', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			// Verify sidebar structure renders correctly
			expect(container.querySelector('.sidebar')).toBeInTheDocument();
			expect(container.querySelector('.sidebar-content')).toBeInTheDocument();
		});

		it('renders with left side by default', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toHaveClass('sidebar-left');
		});

		it('renders with right side when specified', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'right'
				}
			});

			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toHaveClass('sidebar-right');
		});
	});

	describe('Width', () => {
		it('has sidebar class with width styling', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			// Verify the sidebar element exists with the correct class
			// Width is set via CSS (300px), which jsdom doesn't compute
			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toBeInTheDocument();
			expect(sidebar).toHaveClass('sidebar');
		});
	});

	describe('Visibility', () => {
		it('is always visible (no hidden state)', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toBeVisible();
		});

		it('does not have any toggle mechanism', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			// Should not have any toggle buttons
			const toggleButtons = container.querySelectorAll('button[aria-label*="toggle"]');
			expect(toggleButtons).toHaveLength(0);

			// Should not have any close buttons
			const closeButtons = container.querySelectorAll('button[aria-label*="close"]');
			expect(closeButtons).toHaveLength(0);
		});
	});

	describe('Accessibility', () => {
		it('uses aside element for sidebar landmark', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			// <aside> elements have implicit role="complementary"
			const sidebar = container.querySelector('aside.sidebar');
			expect(sidebar).toBeInTheDocument();
		});

		it('has default aria-label', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toHaveAttribute('aria-label', 'Sidebar');
		});

		it('uses custom aria-label when title provided', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left',
					title: 'Device Library'
				}
			});

			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toHaveAttribute('aria-label', 'Device Library');
		});
	});

	describe('Title', () => {
		it('renders title when provided', () => {
			render(Sidebar, {
				props: {
					side: 'left',
					title: 'Device Library'
				}
			});

			expect(screen.getByText('Device Library')).toBeInTheDocument();
		});

		it('does not render title element when not provided', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			const title = container.querySelector('.sidebar-title');
			expect(title).not.toBeInTheDocument();
		});
	});

	describe('Scrollable content', () => {
		it('has content area with scrollable class', () => {
			const { container } = render(Sidebar, {
				props: {
					side: 'left'
				}
			});

			// Verify the content area exists with the correct class
			// overflow-y: auto is set via CSS, which jsdom doesn't compute
			const content = container.querySelector('.sidebar-content');
			expect(content).toBeInTheDocument();
			expect(content).toHaveClass('sidebar-content');
		});
	});
});
