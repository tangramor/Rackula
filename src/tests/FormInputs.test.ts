import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NewRackForm from '$lib/components/NewRackForm.svelte';
import AddDeviceForm from '$lib/components/AddDeviceForm.svelte';

describe('Form Input Styles', () => {
	describe('NewRackForm Input States', () => {
		it('input renders in rest state with input-field class', () => {
			render(NewRackForm, { props: { open: true } });

			const nameInput = screen.getByRole('textbox', { name: /rack name/i });
			expect(nameInput).toBeInTheDocument();
			expect(nameInput).toHaveClass('input-field');
			expect(nameInput).not.toBeDisabled();
		});

		it('input is focusable', async () => {
			render(NewRackForm, { props: { open: true } });

			const nameInput = screen.getByRole('textbox', { name: /rack name/i }) as HTMLInputElement;

			// Input should be focusable (not have tabindex=-1)
			expect(nameInput.tabIndex).not.toBe(-1);

			// Focus the input programmatically
			nameInput.focus();

			// Input should now be focused
			expect(document.activeElement).toBe(nameInput);
		});

		it('input shows error state when validation fails', async () => {
			render(NewRackForm, { props: { open: true } });

			// Clear the name field
			const nameInput = screen.getByRole('textbox', { name: /rack name/i }) as HTMLInputElement;
			await fireEvent.input(nameInput, { target: { value: '' } });

			// Click Create to trigger validation
			const createButton = screen.getByRole('button', { name: /create/i });
			await fireEvent.click(createButton);

			// Error message should appear
			expect(screen.getByText(/name is required/i)).toBeInTheDocument();
			expect(nameInput).toHaveClass('error');
		});
	});

	describe('AddDeviceForm Input States', () => {
		it('input renders with input-field class', () => {
			render(AddDeviceForm, { props: { open: true } });

			const nameInput = screen.getByRole('textbox', { name: /^name$/i });
			expect(nameInput).toBeInTheDocument();
			expect(nameInput).toHaveClass('input-field');
		});

		it('number input has input-field class', () => {
			render(AddDeviceForm, { props: { open: true } });

			const heightInput = screen.getByRole('spinbutton', { name: /height/i });
			expect(heightInput).toBeInTheDocument();
			expect(heightInput).toHaveClass('input-field');
		});

		it('select has input-field class', () => {
			render(AddDeviceForm, { props: { open: true } });

			const categorySelect = screen.getByRole('combobox', { name: /category/i });
			expect(categorySelect).toBeInTheDocument();
			expect(categorySelect).toHaveClass('input-field');
		});

		it('textarea has input-field class', () => {
			render(AddDeviceForm, { props: { open: true } });

			const notesTextarea = screen.getByRole('textbox', { name: /notes/i });
			expect(notesTextarea).toBeInTheDocument();
			expect(notesTextarea).toHaveClass('input-field');
		});

		it('shows error state when name is empty', async () => {
			render(AddDeviceForm, { props: { open: true } });

			// Click Add to trigger validation with empty name
			const addButton = screen.getByRole('button', { name: /^add$/i });
			await fireEvent.click(addButton);

			// Error message should appear
			expect(screen.getByText(/name is required/i)).toBeInTheDocument();
		});
	});

	describe('Input Hover State', () => {
		it('input can receive hover events', async () => {
			render(NewRackForm, { props: { open: true } });

			const nameInput = screen.getByRole('textbox', { name: /rack name/i });
			await fireEvent.mouseEnter(nameInput);

			// CSS hover state is applied by browser
			expect(nameInput).toBeInTheDocument();
		});
	});

	describe('Input Focus Ring', () => {
		it('input can receive focus for focus ring display', async () => {
			render(NewRackForm, { props: { open: true } });

			const nameInput = screen.getByRole('textbox', { name: /rack name/i }) as HTMLInputElement;

			// Input should be focusable
			nameInput.focus();

			// Verify input is focused - CSS handles the visual ring
			expect(document.activeElement).toBe(nameInput);
		});
	});

	describe('Error Message Display', () => {
		it('error message displays below invalid input', async () => {
			render(AddDeviceForm, { props: { open: true } });

			// Submit form without filling name
			const addButton = screen.getByRole('button', { name: /^add$/i });
			await fireEvent.click(addButton);

			const errorMessage = screen.getByText(/name is required/i);
			expect(errorMessage).toBeInTheDocument();
			expect(errorMessage).toHaveClass('error-message');
		});
	});
});
