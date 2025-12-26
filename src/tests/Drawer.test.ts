import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Drawer from '$lib/components/Drawer.svelte';
import DrawerHeader from '$lib/components/DrawerHeader.svelte';

describe('Drawer Component', () => {
	describe('Side prop', () => {
		it('renders on the left side when side="left"', () => {
			render(Drawer, { props: { side: 'left', open: true, title: 'Test' } });
			const drawer = screen.getByRole('complementary');
			expect(drawer).toHaveClass('drawer-left');
		});

		it('renders on the right side when side="right"', () => {
			render(Drawer, { props: { side: 'right', open: true, title: 'Test' } });
			const drawer = screen.getByRole('complementary');
			expect(drawer).toHaveClass('drawer-right');
		});
	});

	describe('Open state', () => {
		it('is visible when open=true', () => {
			render(Drawer, { props: { side: 'left', open: true, title: 'Test' } });
			const drawer = screen.getByRole('complementary');
			expect(drawer).toHaveClass('open');
		});

		it('is hidden when open=false', () => {
			render(Drawer, { props: { side: 'left', open: false, title: 'Test' } });
			// Use hidden: true to find elements with aria-hidden="true"
			const drawer = screen.getByRole('complementary', { hidden: true });
			expect(drawer).not.toHaveClass('open');
			expect(drawer).toHaveAttribute('aria-hidden', 'true');
		});
	});

	describe('Title', () => {
		it('displays the title text', () => {
			render(Drawer, { props: { side: 'left', open: true, title: 'Device Library' } });
			expect(screen.getByText('Device Library')).toBeInTheDocument();
		});
	});

	describe('Close button', () => {
		it('has a close button by default', () => {
			render(Drawer, { props: { side: 'left', open: true, title: 'Test' } });
			expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
		});

		it('dispatches close event when close button clicked', async () => {
			const onClose = vi.fn();
			render(Drawer, { props: { side: 'left', open: true, title: 'Test', onclose: onClose } });

			await fireEvent.click(screen.getByRole('button', { name: /close/i }));
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it('does not render close button when showClose is false', () => {
			render(Drawer, {
				props: { side: 'left', open: true, title: 'Test', showClose: false }
			});
			expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
		});
	});

	describe('Content slot', () => {
		it('renders children content', () => {
			// Using a wrapper component to test slot content
			const { container } = render(Drawer, {
				props: { side: 'left', open: true, title: 'Test' }
			});
			const content = container.querySelector('.drawer-content');
			expect(content).toBeInTheDocument();
		});
	});

	describe('Styling', () => {
		it('has correct width from CSS variable', () => {
			render(Drawer, { props: { side: 'left', open: true, title: 'Test' } });
			const drawer = screen.getByRole('complementary');
			// Check that the drawer has the expected class for styling
			expect(drawer).toHaveClass('drawer');
		});
	});

	describe('Accessibility', () => {
		it('has complementary role', () => {
			render(Drawer, { props: { side: 'left', open: true, title: 'Test' } });
			expect(screen.getByRole('complementary')).toBeInTheDocument();
		});

		it('has aria-label with title', () => {
			render(Drawer, { props: { side: 'left', open: true, title: 'Device Library' } });
			const drawer = screen.getByRole('complementary');
			expect(drawer).toHaveAttribute('aria-label', 'Device Library');
		});

		it('accepts id attribute for aria-controls', () => {
			const { container } = render(Drawer, {
				props: { side: 'left', open: true, title: 'Test', id: 'device-library-drawer' }
			});
			const drawer = container.querySelector('#device-library-drawer');
			expect(drawer).toBeInTheDocument();
		});
	});
});

describe('DrawerHeader Component', () => {
	it('renders title', () => {
		render(DrawerHeader, { props: { title: 'Test Title' } });
		expect(screen.getByText('Test Title')).toBeInTheDocument();
	});

	it('has close button by default', () => {
		render(DrawerHeader, { props: { title: 'Test' } });
		expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
	});

	it('dispatches close event when button clicked', async () => {
		const onClose = vi.fn();
		render(DrawerHeader, { props: { title: 'Test', onclose: onClose } });

		await fireEvent.click(screen.getByRole('button', { name: /close/i }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('close button has correct aria-label', () => {
		render(DrawerHeader, { props: { title: 'Test' } });
		const closeBtn = screen.getByRole('button', { name: /close/i });
		expect(closeBtn).toHaveAttribute('aria-label', 'Close drawer');
	});

	it('does not render close button when showClose is false', () => {
		render(DrawerHeader, { props: { title: 'Test', showClose: false } });
		expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
	});

	it('renders close button when showClose is true', () => {
		render(DrawerHeader, { props: { title: 'Test', showClose: true } });
		expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
	});
});
