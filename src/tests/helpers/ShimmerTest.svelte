<!--
  Test wrapper for Shimmer component
  Provides children content for testing
-->
<script lang="ts">
	import Shimmer from '$lib/components/Shimmer.svelte';

	interface Props {
		loading?: boolean;
	}

	let { loading = false }: Props = $props();
</script>

<Shimmer {loading}>
	<div class="test-content">Test Content</div>
</Shimmer>

<style>
	.test-content {
		padding: 20px;
		background: #333;
	}
</style>
