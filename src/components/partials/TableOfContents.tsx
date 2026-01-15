import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type Heading = {
	depth: number;
	text: string;
	slug: string;
	subheadings: Heading[];
};

interface TableOfContentsProps {
	headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
	const toc = buildToc(headings);

	function buildToc(headings: Heading[]) {
		const toc: Heading[] = [];
		const parentHeadings = new Map();

		headings.forEach((h) => {
			const heading = { ...h, subheadings: [] };
			parentHeadings.set(heading.depth, heading);
			// Change 2 to 1 if the markdown includes <h1>
			if (heading.depth === 1 || heading.depth === 2) {
				toc.push(heading);
			} else {
				parentHeadings.get(heading.depth - 1).subheadings.push(heading);
			}
		});

		return toc;
	}

	// Recursive function component to render headings and subheadings
	function HeadingItem({ heading }: { heading: Heading }): ReactNode {
		return (
			<li className="flex flex-col">
				<a
					href={"#" + heading.slug}
					className="group hover:bg-primary mb-2 line-clamp-2 flex w-full flex-row items-center gap-2 rounded-lg px-4 py-2 text-xs transition-colors duration-400 first-letter:uppercase"
				>
					<ArrowRight className="size-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
					<span className="">{heading.text}</span>
				</a>
				{heading.subheadings.length > 0 && (
					<ul>
						{heading.subheadings.map((subheading, index) => (
							<HeadingItem key={index} heading={subheading} />
						))}
					</ul>
				)}
			</li>
		);
	}

	return (
		<nav className="max-w-max">
			<p className="mb-3 text-center text-xl">Jump to Section</p>
			<ul className="flex flex-col gap-1 [text-wrap:balance]">
				{toc.map((heading, index) => (
					<HeadingItem key={index} heading={heading} />
				))}
			</ul>
		</nav>
	);
}
