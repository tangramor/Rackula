/**
 * Coordinate transformation utilities using getScreenCTM().
 *
 * These utilities automatically handle all CSS transforms (zoom, pan)
 * without manual compensation. Use these instead of manual
 * getBoundingClientRect() + division by zoomScale.
 */

/**
 * Convert screen coordinates (clientX/clientY) to SVG user space coordinates.
 * Accounts for all transforms (zoom, pan, CSS) automatically.
 *
 * @param svg - The SVG element to transform coordinates for
 * @param clientX - Screen X coordinate (from mouse event)
 * @param clientY - Screen Y coordinate (from mouse event)
 * @returns SVG user space coordinates { x, y }
 */
export function screenToSVG(
	svg: SVGSVGElement,
	clientX: number,
	clientY: number
): { x: number; y: number } {
	const pt = svg.createSVGPoint();
	pt.x = clientX;
	pt.y = clientY;

	const ctm = svg.getScreenCTM();
	if (!ctm) {
		// Fallback if CTM unavailable (shouldn't happen in normal use)
		return { x: clientX, y: clientY };
	}

	const transformed = pt.matrixTransform(ctm.inverse());
	return { x: transformed.x, y: transformed.y };
}

/**
 * Convert SVG user space coordinates to screen coordinates.
 * Useful for positioning DOM elements relative to SVG content.
 *
 * @param svg - The SVG element to transform coordinates for
 * @param x - SVG X coordinate
 * @param y - SVG Y coordinate
 * @returns Screen coordinates { clientX, clientY }
 */
export function svgToScreen(
	svg: SVGSVGElement,
	x: number,
	y: number
): { clientX: number; clientY: number } {
	const pt = svg.createSVGPoint();
	pt.x = x;
	pt.y = y;

	const ctm = svg.getScreenCTM();
	if (!ctm) {
		// Fallback if CTM unavailable
		return { clientX: x, clientY: y };
	}

	const transformed = pt.matrixTransform(ctm);
	return { clientX: transformed.x, clientY: transformed.y };
}
