<!--
  LogoLoader Component
  Animated logo with slot reveal for loading states
  Used during async operations like export generation
-->
<script lang="ts">
	interface Props {
		size?: number;
		message?: string;
	}

	let { size = 48, message = '' }: Props = $props();
</script>

<div class="logo-loader" role="status" aria-live="polite">
	<!-- Logo mark with animated slots -->
	<svg
		class="logo-mark"
		viewBox="0 0 32 32"
		width={size}
		height={size}
		aria-hidden="true"
		fill-rule="evenodd"
	>
		<!-- Outer frame (static) -->
		<path
			class="frame"
			d="M6 4 h20 v24 h-20 z"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		/>

		<!-- Animated slots with staggered fill -->
		<rect class="slot slot-1" x="10" y="8" width="12" height="4" />
		<rect class="slot slot-2" x="10" y="14" width="12" height="4" />
		<rect class="slot slot-3" x="10" y="20" width="12" height="4" />
	</svg>

	{#if message}
		<span class="loader-message">{message}</span>
	{/if}
</div>

<style>
	.logo-loader {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
	}

	.logo-mark {
		color: var(--dracula-purple);
		filter: drop-shadow(0 0 8px rgba(189, 147, 249, 0.3));
	}

	.frame {
		stroke: var(--dracula-purple);
	}

	.slot {
		fill: var(--dracula-purple);
		transform-origin: left center;
		animation: slot-fill var(--anim-loading, 2s) ease-in-out infinite;
	}

	.slot-1 {
		animation-delay: 0s;
	}

	.slot-2 {
		animation-delay: 0.3s;
	}

	.slot-3 {
		animation-delay: 0.6s;
	}

	.loader-message {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--colour-text-muted);
		text-align: center;
	}

	/* Reduced motion: static slots */
	@media (prefers-reduced-motion: reduce) {
		.slot {
			animation: none;
			opacity: 0.6;
		}

		.slot-1 {
			opacity: 1;
		}

		.slot-2 {
			opacity: 0.8;
		}

		.slot-3 {
			opacity: 0.6;
		}
	}
</style>
