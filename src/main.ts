import App from './App.svelte';
import './app.css';
import { mount } from 'svelte';
import { initAnalytics } from '$lib/utils/analytics';

// Initialize analytics before mounting app
initAnalytics();

const app = mount(App, {
	target: document.getElementById('app')!
});

export default app;
