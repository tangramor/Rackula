import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Sidebar from '$lib/components/Sidebar.svelte';

describe('Sidebar Responsive Structure', () => {
	describe('CSS class structure', () => {
		it('sidebar has sidebar class for styling', () => {
			const { container } = render(Sidebar, {
				props: { side: 'left', title: 'Test' }
			});

			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toBeInTheDocument();
			expect(sidebar).toHaveClass('sidebar');
			expect(sidebar).toHaveClass('sidebar-left');
		});

		it('sidebar is an aside element for semantics', () => {
			const { container } = render(Sidebar, {
				props: { side: 'left', title: 'Test' }
			});

			const sidebar = container.querySelector('aside.sidebar');
			expect(sidebar).toBeInTheDocument();
		});
	});

	describe('Content structure', () => {
		it('sidebar-content class exists for scrollable area', () => {
			const { container } = render(Sidebar, {
				props: { side: 'left', title: 'Test' }
			});

			const content = container.querySelector('.sidebar-content');
			expect(content).toBeInTheDocument();
		});

		it('sidebar-header exists when title provided', () => {
			const { container } = render(Sidebar, {
				props: { side: 'left', title: 'Device Library' }
			});

			const header = container.querySelector('.sidebar-header');
			expect(header).toBeInTheDocument();

			const title = container.querySelector('.sidebar-title');
			expect(title?.textContent).toBe('Device Library');
		});

		it('sidebar-header hidden when no title', () => {
			const { container } = render(Sidebar, {
				props: { side: 'left' }
			});

			const header = container.querySelector('.sidebar-header');
			expect(header).not.toBeInTheDocument();
		});
	});

	describe('Responsive CSS classes exist', () => {
		it('sidebar element can be targeted for responsive width', () => {
			const { container } = render(Sidebar, {
				props: { side: 'left', title: 'Test' }
			});

			// Verify the sidebar class exists which is targeted by responsive CSS
			const sidebar = container.querySelector('.sidebar');
			expect(sidebar).toBeInTheDocument();

			// The responsive media query targets .sidebar in tokens.css
			// This test verifies the class exists for the CSS to target
		});
	});
});
