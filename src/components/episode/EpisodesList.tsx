import { useState } from "react";
import type { CollectionEntry } from "astro:content";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoveRight } from "lucide-react";
import { Label } from "@radix-ui/react-dropdown-menu";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "../ui/card";

interface EpisodesListProps {
	episodes: CollectionEntry<"episodes">[];
	itemsPerPage?: number;
}

type SortField = "title" | "date";
type SortDirection = "asc" | "desc";

export default function EpisodesList({
	episodes,
	itemsPerPage = 12,
}: EpisodesListProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [sortField, setSortField] = useState<SortField>("date");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	// Sort episodes
	const sortedEpisodes = [...episodes].sort((a, b) => {
		if (sortField === "title") {
			return sortDirection === "asc"
				? a.data.title.localeCompare(b.data.title)
				: b.data.title.localeCompare(a.data.title);
		} else {
			return sortDirection === "asc"
				? a.data.date.valueOf() - b.data.date.valueOf()
				: b.data.date.valueOf() - a.data.date.valueOf();
		}
	});

	// Calculate pagination
	const totalItems = sortedEpisodes.length;
	const totalPages = Math.ceil(totalItems / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentEpisodes = sortedEpisodes.slice(startIndex, endIndex);

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages = [];
		const maxVisiblePages = 5;

		if (totalPages <= maxVisiblePages) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(1);

			// Calculate range around current page
			let start = Math.max(2, currentPage - 1);
			let end = Math.min(totalPages - 1, currentPage + 1);

			// Adjust if at the start or end
			if (currentPage <= 2) {
				end = 4;
			} else if (currentPage >= totalPages - 1) {
				start = totalPages - 3;
			}

			// Add ellipsis and numbers
			if (start > 2) pages.push("...");
			for (let i = start; i <= end; i++) {
				pages.push(i);
			}
			if (end < totalPages - 1) pages.push("...");

			// Always show last page
			pages.push(totalPages);
		}

		return pages;
	};

	return (
		<div>
			{/* Breadcrumb navigation */}
			<Breadcrumb className="my-8">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/">Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>All Episodes</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Container for the sorting options */}
			<div className="mb-6 flex items-center gap-4">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<div>
							<Label className="mb-1 text-sm font-light">Sort by:</Label>
							<Button variant="outline" className="w-[150px] justify-between">
								{sortField === "title" ? "Title" : "Date"}
							</Button>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => setSortField("title")}>
							Title
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setSortField("date")}>
							Date
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<div>
					<Label className="mb-1 text-sm font-light">Sort direction:</Label>
					<Button
						variant="outline"
						size="icon"
						onClick={() =>
							setSortDirection(sortDirection === "asc" ? "desc" : "asc")
						}
					>
						<ArrowUpDown
							className={`size-4 transition-transform ${
								sortDirection === "asc" ? "rotate-180" : ""
							}`}
						/>
					</Button>
				</div>
			</div>

			{/* Container for the episode cards */}
			<div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{currentEpisodes.map((episode) => (
					<Card key={episode.slug} className="py-4">
						<a
							href={`/episodes/${episode.slug}`}
							className="group flex h-full flex-col justify-between space-y-4 transition-transform duration-200 hover:scale-102"
						>
							<CardHeader>
								<CardTitle className="mb-2 text-xl font-semibold">
									{episode.data.title}
								</CardTitle>
								<CardDescription>{episode.data.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="mb-3 text-sm">
									{new Date(episode.data.date).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									{episode.data.tags.map((tag) => (
										<span
											key={tag}
											className="rounded bg-stone-100 px-2 py-1 text-xs dark:bg-stone-700"
										>
											{tag}
										</span>
									))}
								</div>
							</CardContent>
							<CardFooter>
								View Episode{" "}
								<MoveRight className="ml-2 size-4 transition-transform group-hover:-rotate-45" />
							</CardFooter>
						</a>
					</Card>
				))}
			</div>

			{totalPages > 1 && (
				<div className="mt-12">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
									className={
										currentPage === 1 ? "pointer-events-none opacity-50" : ""
									}
								/>
							</PaginationItem>

							{getPageNumbers().map((page, index) => (
								<PaginationItem key={index}>
									{page === "..." ? (
										<PaginationEllipsis />
									) : (
										<PaginationLink
											onClick={() => setCurrentPage(page as number)}
											isActive={currentPage === page}
										>
											{page}
										</PaginationLink>
									)}
								</PaginationItem>
							))}

							<PaginationItem>
								<PaginationNext
									onClick={() =>
										setCurrentPage(Math.min(totalPages, currentPage + 1))
									}
									className={
										currentPage === totalPages
											? "pointer-events-none opacity-50"
											: ""
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	);
}
