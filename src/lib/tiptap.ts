/**
 * Tiptap Content Parser & HTML Converter
 *
 * Utilities for parsing and rendering Tiptap/Prosemirror JSON content.
 */

// ============================================================================
// Types
// ============================================================================

export interface TiptapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

export interface TiptapNode {
	type: string;
	content?: TiptapNode[];
	marks?: TiptapMark[];
	attrs?: Record<string, unknown>;
	text?: string;
}

export interface TiptapContent {
	type: "doc";
	content: TiptapNode[];
}

// ============================================================================
// HTML Escaping
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Escape attribute values for safe HTML output
 */
function escapeAttr(value: string | undefined): string {
	if (!value) return "";
	return escapeHtml(value);
}

// ============================================================================
// Mark Rendering
// ============================================================================

/**
 * Apply a mark (bold, italic, link, etc.) to text content
 */
function applyMark(text: string, mark: TiptapMark): string {
	switch (mark.type) {
		case "bold":
			return `<strong>${text}</strong>`;
		case "italic":
			return `<em>${text}</em>`;
		case "underline":
			return `<u>${text}</u>`;
		case "code":
			return `<code>${escapeHtml(text)}</code>`;
		case "strike":
			return `<s>${text}</s>`;
		case "link": {
			const href = escapeAttr(mark.attrs?.href as string);
			const target = mark.attrs?.target as string | undefined;
			const rel = mark.attrs?.rel as string | undefined;
			const targetAttr = target ? ` target="${escapeAttr(target)}"` : "";
			const relAttr = rel
				? ` rel="${escapeAttr(rel)}"`
				: target === "_blank"
					? ' rel="noopener noreferrer"'
					: "";
			return `<a href="${href}"${targetAttr}${relAttr}>${text}</a>`;
		}
		case "highlight":
			return `<mark>${text}</mark>`;
		case "subscript":
			return `<sub>${text}</sub>`;
		case "superscript":
			return `<sup>${text}</sup>`;
		default:
			return text;
	}
}

// ============================================================================
// Node Rendering
// ============================================================================

/**
 * Convert a Tiptap node to HTML
 */
function nodeToHtml(node: TiptapNode): string {
	// Handle text nodes
	if (node.type === "text") {
		let text = escapeHtml(node.text || "");

		// Apply marks in order
		if (node.marks && Array.isArray(node.marks)) {
			for (const mark of node.marks) {
				text = applyMark(text, mark);
			}
		}

		return text;
	}

	// Handle hard breaks
	if (node.type === "hardBreak") {
		return "<br />";
	}

	// Handle horizontal rules
	if (node.type === "horizontalRule") {
		return "<hr />";
	}

	// Handle images
	if (node.type === "image") {
		const src = escapeAttr(node.attrs?.src as string);
		const alt = escapeAttr(node.attrs?.alt as string);
		const title = node.attrs?.title as string | undefined;
		const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
		return `<img src="${src}" alt="${alt}"${titleAttr} loading="lazy" />`;
	}

	// Recursively render child content
	const childrenHtml =
		node.content?.map((child) => nodeToHtml(child)).join("") || "";

	// Handle different node types
	switch (node.type) {
		case "doc":
			return childrenHtml;

		case "paragraph":
			return `<p>${childrenHtml}</p>`;

		case "heading": {
			const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
			return `<h${level}>${childrenHtml}</h${level}>`;
		}

		case "bulletList":
			return `<ul>${childrenHtml}</ul>`;

		case "orderedList": {
			const start = node.attrs?.start as number | undefined;
			const startAttr = start && start !== 1 ? ` start="${start}"` : "";
			return `<ol${startAttr}>${childrenHtml}</ol>`;
		}

		case "listItem":
			return `<li>${childrenHtml}</li>`;

		case "taskList":
			return `<ul class="task-list">${childrenHtml}</ul>`;

		case "taskItem": {
			const checked = node.attrs?.checked as boolean;
			const checkedAttr = checked ? " checked" : "";
			return `<li class="task-item"><input type="checkbox" disabled${checkedAttr} />${childrenHtml}</li>`;
		}

		case "codeBlock": {
			const language = node.attrs?.language as string | undefined;
			const langClass = language
				? ` class="language-${escapeAttr(language)}"`
				: "";
			// For code blocks, we need to get the raw text without escaping twice
			const codeContent =
				node.content
					?.map((child) => (child.type === "text" ? child.text || "" : ""))
					.join("") || "";
			return `<pre><code${langClass}>${escapeHtml(codeContent)}</code></pre>`;
		}

		case "blockquote":
			return `<blockquote>${childrenHtml}</blockquote>`;

		case "table":
			return `<table>${childrenHtml}</table>`;

		case "tableRow":
			return `<tr>${childrenHtml}</tr>`;

		case "tableHeader":
			return `<th>${childrenHtml}</th>`;

		case "tableCell":
			return `<td>${childrenHtml}</td>`;

		case "youtube":
		case "video": {
			const src = escapeAttr(node.attrs?.src as string);
			return `<div class="video-embed"><iframe src="${src}" frameborder="0" allowfullscreen></iframe></div>`;
		}

		default:
			// For unknown node types, just render children
			return childrenHtml;
	}
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Convert Tiptap JSON content to HTML string
 *
 * @param content - The Tiptap JSON content (usually from postContent field)
 * @returns HTML string ready to be rendered
 *
 * @example
 * ```typescript
 * const html = tiptapToHtml(post.postContent);
 * // Use with Astro's set:html directive
 * <div set:html={html} />
 * ```
 */
export function tiptapToHtml(content: unknown): string {
	if (!content || typeof content !== "object") {
		return "";
	}

	const doc = content as TiptapContent;

	if (doc.type !== "doc" || !Array.isArray(doc.content)) {
		// If it's already a string, return as-is
		if (typeof content === "string") {
			return content;
		}
		return "";
	}

	return doc.content.map((node) => nodeToHtml(node)).join("");
}

/**
 * Extract plain text from Tiptap content (useful for excerpts, meta descriptions)
 *
 * @param content - The Tiptap JSON content
 * @returns Plain text string without any formatting
 */
export function extractPlainText(content: unknown): string {
	if (!content || typeof content !== "object") {
		return "";
	}

	const doc = content as TiptapContent;

	if (doc.type !== "doc" || !Array.isArray(doc.content)) {
		if (typeof content === "string") {
			return content;
		}
		return "";
	}

	function extractFromNode(node: TiptapNode): string {
		if (node.type === "text") {
			return node.text || "";
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.map(extractFromNode).join("");
		}

		return "";
	}

	return doc.content
		.map((node) => extractFromNode(node))
		.join("\n")
		.trim();
}

/**
 * Extract headings from Tiptap content (useful for table of contents)
 *
 * @param content - The Tiptap JSON content
 * @returns Array of headings with level and text
 */
export function extractHeadings(
	content: unknown,
): Array<{ level: number; text: string; id: string }> {
	if (!content || typeof content !== "object") {
		return [];
	}

	const doc = content as TiptapContent;

	if (doc.type !== "doc" || !Array.isArray(doc.content)) {
		return [];
	}

	const headings: Array<{ level: number; text: string; id: string }> = [];

	function traverse(nodes: TiptapNode[]): void {
		for (const node of nodes) {
			if (node.type === "heading") {
				const text = extractPlainTextFromNode(node);
				const id = slugify(text);
				headings.push({
					level: (node.attrs?.level as number) || 1,
					text,
					id,
				});
			}

			if (node.content && Array.isArray(node.content)) {
				traverse(node.content);
			}
		}
	}

	traverse(doc.content);
	return headings;
}

/**
 * Helper to extract plain text from a single node
 */
function extractPlainTextFromNode(node: TiptapNode): string {
	if (node.type === "text") {
		return node.text || "";
	}

	if (node.content && Array.isArray(node.content)) {
		return node.content.map(extractPlainTextFromNode).join("");
	}

	return "";
}

/**
 * Convert text to a URL-friendly slug
 */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

/**
 * Calculate estimated reading time based on content
 *
 * @param content - The Tiptap JSON content
 * @param wordsPerMinute - Reading speed (default: 200 wpm)
 * @returns Estimated reading time in minutes
 */
export function calculateReadingTime(
	content: unknown,
	wordsPerMinute = 200,
): number {
	const plainText = extractPlainText(content);
	const wordCount = plainText.split(/\s+/).filter(Boolean).length;
	return Math.ceil(wordCount / wordsPerMinute) || 1;
}

/**
 * Check if Tiptap content is empty
 *
 * @param content - The Tiptap JSON content
 * @returns true if content is empty or has no meaningful text
 */
export function isContentEmpty(content: unknown): boolean {
	const plainText = extractPlainText(content);
	return plainText.trim().length === 0;
}
