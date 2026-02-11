/**
 * Lightbox Component
 *
 * A full-screen image viewer built on Radix Dialog primitives.
 * Provides focus trapping, scroll locking, and Escape key handling
 * with styling optimized for full-viewport image display.
 *
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function Lightbox({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root {...props} />;
}

function LightboxOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			className={cn(
				"fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
				className,
			)}
			{...props}
		/>
	);
}

function LightboxContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
	return (
		<DialogPrimitive.Portal>
			<LightboxOverlay />
			<DialogPrimitive.Content
				className={cn(
					"fixed inset-0 z-50 flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					className,
				)}
				{...props}
			>
				{children}
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

function LightboxClose({
	className,
	children,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<DialogPrimitive.Close
					className={cn(
						"rounded-sm p-2 text-white/70 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30",
						className,
					)}
					{...props}
				>
					{children ?? (
						<>
							<X className="size-6" />
							<span className="sr-only">Close</span>
						</>
					)}
				</DialogPrimitive.Close>
			</TooltipTrigger>
			<TooltipContent>Close</TooltipContent>
		</Tooltip>
	);
}

function LightboxTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title className={cn("sr-only", className)} {...props} />
	);
}

export {
	Lightbox,
	LightboxClose,
	LightboxContent,
	LightboxOverlay,
	LightboxTitle,
};
