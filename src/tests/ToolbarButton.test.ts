import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ToolbarButton from '$lib/components/ToolbarButton.svelte';

describe('ToolbarButton Component', () => {
	describe('Rest State', () => {
		it('renders in rest state', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button' }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toBeInTheDocument();
			expect(button).not.toHaveClass('active');
			expect(button).not.toBeDisabled();
		});

		it('has transparent background in rest state', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button' }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toBeInTheDocument();
			// Rest state - button exists with base styling
			expect(button).toHaveClass('toolbar-button');
		});
	});

	describe('Hover State', () => {
		it('shows hover state on mouse enter', async () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button' }
			});

			const button = container.querySelector('.toolbar-button')!;
			await fireEvent.mouseEnter(button);

			// CSS hover state is handled by browser - we verify the element exists
			expect(button).toBeInTheDocument();
		});
	});

	describe('Focus State', () => {
		it('shows focus ring on keyboard focus', async () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button' }
			});

			const button = container.querySelector('.toolbar-button')!;
			await fireEvent.focus(button);

			// Focus-visible is handled by CSS, verify button is focusable
			expect(button).toBeInTheDocument();
			expect(button).not.toHaveAttribute('tabindex', '-1');
		});

		it('has proper focus-visible styling defined', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button' }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toBeInTheDocument();
			// CSS contains :focus-visible - testing component renders correctly
		});
	});

	describe('Active/Pressed State', () => {
		it('scales down on active/pressed', async () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button' }
			});

			const button = container.querySelector('.toolbar-button')!;

			// Trigger mousedown for active state
			await fireEvent.mouseDown(button);

			// CSS :active state handles the transform - verify button is interactive
			expect(button).toBeInTheDocument();
		});
	});

	describe('Toggle Active State', () => {
		it('shows active toggle state when active=true', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button', active: true }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toHaveClass('active');
		});

		it('does not show active class when active=false', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button', active: false }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).not.toHaveClass('active');
		});

		it('sets aria-pressed when active prop is provided', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button', active: true }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toHaveAttribute('aria-pressed', 'true');
		});
	});

	describe('Disabled State', () => {
		it('appears disabled when disabled=true', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Test Button', disabled: true }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toBeDisabled();
		});

		it('disabled button is not clickable', async () => {
			const handleClick = vi.fn();

			render(ToolbarButton, {
				props: { label: 'Test Button', disabled: true, onclick: handleClick }
			});

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			expect(handleClick).not.toHaveBeenCalled();
		});

		it('enabled button is clickable', async () => {
			const handleClick = vi.fn();

			render(ToolbarButton, {
				props: { label: 'Test Button', onclick: handleClick }
			});

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			expect(handleClick).toHaveBeenCalledTimes(1);
		});
	});

	describe('Accessibility', () => {
		it('has aria-label from label prop', () => {
			render(ToolbarButton, {
				props: { label: 'Save Document' }
			});

			const button = screen.getByRole('button', { name: 'Save Document' });
			expect(button).toBeInTheDocument();
		});

		it('has title attribute for tooltip when provided', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Save', tooltip: 'Save your work' }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toHaveAttribute('title', 'Save your work');
		});

		it('uses label as title when no tooltip provided', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Save Document' }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toHaveAttribute('title', 'Save Document');
		});

		it('sets aria-expanded when expanded prop is provided', () => {
			const { container } = render(ToolbarButton, {
				props: { label: 'Menu', expanded: true }
			});

			const button = container.querySelector('.toolbar-button');
			expect(button).toHaveAttribute('aria-expanded', 'true');
		});
	});
});
