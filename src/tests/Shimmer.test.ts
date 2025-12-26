import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ShimmerTest from './helpers/ShimmerTest.svelte';

describe('Shimmer', () => {
	describe('Container Structure', () => {
		it('renders container with children', () => {
			const { container } = render(ShimmerTest, { props: { loading: false } });
			const shimmerContainer = container.querySelector('.shimmer-container');

			expect(shimmerContainer).toBeInTheDocument();
		});

		it('renders children content', () => {
			const { getByText } = render(ShimmerTest, { props: { loading: false } });

			expect(getByText('Test Content')).toBeInTheDocument();
		});
	});

	describe('Loading State', () => {
		it('shows shimmer overlay when loading=true', () => {
			const { container } = render(ShimmerTest, { props: { loading: true } });
			const overlay = container.querySelector('.shimmer-overlay');

			expect(overlay).toBeInTheDocument();
		});

		it('hides shimmer overlay when loading=false', () => {
			const { container } = render(ShimmerTest, { props: { loading: false } });
			const overlay = container.querySelector('.shimmer-overlay');

			expect(overlay).not.toBeInTheDocument();
		});

		it('children remain visible during loading', () => {
			const { getByText } = render(ShimmerTest, { props: { loading: true } });

			expect(getByText('Test Content')).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('overlay is hidden from screen readers', () => {
			const { container } = render(ShimmerTest, { props: { loading: true } });
			const overlay = container.querySelector('.shimmer-overlay');

			expect(overlay).toHaveAttribute('aria-hidden', 'true');
		});
	});
});
