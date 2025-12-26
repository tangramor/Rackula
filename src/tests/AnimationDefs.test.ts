import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AnimationDefs from '$lib/components/AnimationDefs.svelte';

describe('AnimationDefs', () => {
	describe('SVG Container', () => {
		it('renders hidden SVG element', () => {
			const { container } = render(AnimationDefs);
			const svg = container.querySelector('svg');

			expect(svg).toBeInTheDocument();
			expect(svg).toHaveAttribute('aria-hidden', 'true');
			expect(svg).toHaveAttribute('width', '0');
			expect(svg).toHaveAttribute('height', '0');
		});

		it('contains defs element', () => {
			const { container } = render(AnimationDefs);
			const defs = container.querySelector('defs');

			expect(defs).toBeInTheDocument();
		});
	});

	describe('Rainbow Wave Gradient', () => {
		it('defines rainbow-wave gradient', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#rainbow-wave');

			expect(gradient).toBeInTheDocument();
			expect(gradient?.tagName.toLowerCase()).toBe('lineargradient');
		});

		it('has three animated stops', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#rainbow-wave');
			const stops = gradient?.querySelectorAll('stop');

			expect(stops?.length).toBe(3);
		});

		it('uses 6s duration for rainbow-wave', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#rainbow-wave');
			const animate = gradient?.querySelector('animate');

			expect(animate).toHaveAttribute('dur', '6s');
			expect(animate).toHaveAttribute('repeatCount', 'indefinite');
		});

		it('includes all Dracula accent colours', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#rainbow-wave');
			const animate = gradient?.querySelector('animate');
			const values = animate?.getAttribute('values') ?? '';

			expect(values).toContain('#BD93F9'); // purple
			expect(values).toContain('#FF79C6'); // pink
			expect(values).toContain('#8BE9FD'); // cyan
			expect(values).toContain('#50FA7B'); // green
			expect(values).toContain('#FFB86C'); // orange
			expect(values).toContain('#FF5555'); // red
			expect(values).toContain('#F1FA8C'); // yellow
		});
	});

	describe('Party Mode Gradient', () => {
		it('defines party-grad gradient', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#party-grad');

			expect(gradient).toBeInTheDocument();
		});

		it('uses 0.5s duration for fast cycling', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#party-grad');
			const animate = gradient?.querySelector('animate');

			expect(animate).toHaveAttribute('dur', '0.5s');
			expect(animate).toHaveAttribute('repeatCount', 'indefinite');
		});
	});

	describe('Loading Gradient', () => {
		it('defines loading-grad gradient', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#loading-grad');

			expect(gradient).toBeInTheDocument();
		});

		it('uses 2s duration for loading cycle', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#loading-grad');
			const animate = gradient?.querySelector('animate');

			expect(animate).toHaveAttribute('dur', '2s');
		});

		it('uses purple and background colours', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#loading-grad');
			const animate = gradient?.querySelector('animate');
			const values = animate?.getAttribute('values') ?? '';

			expect(values).toContain('#BD93F9'); // purple
			expect(values).toContain('#44475A'); // selection/bg
		});
	});

	describe('Celebrate Gradient', () => {
		it('defines celebrate-grad gradient', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#celebrate-grad');

			expect(gradient).toBeInTheDocument();
		});

		it('uses 3s duration for celebration', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#celebrate-grad');
			const animate = gradient?.querySelector('animate');

			expect(animate).toHaveAttribute('dur', '3s');
		});

		it('plays only once (not infinite)', () => {
			const { container } = render(AnimationDefs);
			const gradient = container.querySelector('#celebrate-grad');
			const animate = gradient?.querySelector('animate');

			expect(animate).toHaveAttribute('repeatCount', '1');
			expect(animate).toHaveAttribute('fill', 'freeze');
		});
	});
});
