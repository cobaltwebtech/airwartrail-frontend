// Custom Toast component using Sonner for notifications.
// Toaster wrapper is placed in BaseLayout.astro to render toasts globally across the app.
// To use the toast in a component, import the `toast` object and call the appropriate
// method (e.g., toast.success, toast.error) with your message and options.
import {
	AlertTriangle,
	CheckCircle,
	Info,
	Loader2,
	OctagonX,
	X,
} from "lucide-react";
import { Toaster as SonnerToaster, toast } from "sonner";
import { Button } from "@/components/ui/button";

type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface ToastContentProps {
	title: string;
	description?: string;
	type: ToastType;
}

const icons = {
	success: CheckCircle,
	error: OctagonX,
	warning: AlertTriangle,
	info: Info,
	loading: Loader2,
};

const iconColors = {
	success: "text-green-500",
	error: "text-red-500",
	warning: "text-amber-500",
	info: "text-blue-500",
	loading: "animate-spin",
};

function ToastContent({ title, description, type }: ToastContentProps) {
	const Icon = icons[type];
	const colorClass = iconColors[type];

	return (
		<div className="flex items-start gap-3 rounded-lg bg-popover p-4 border-2 border-border text-popover-foreground shadow-lg">
			<Icon className={`size-5 shrink-0 ${colorClass}`} />
			<div className="flex flex-col">
				<p className="font-medium">{title}</p>
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="ml-auto size-6 shrink-0"
				onClick={() => toast.dismiss()}
			>
				<X className="size-4" />
			</Button>
		</div>
	);
}

interface ToastOptions {
	description?: string;
	duration?: number;
}

export const toaster = {
	success: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="success"
				/>
			),
			{ duration: options?.duration },
		),
	error: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="error"
				/>
			),
			{ duration: options?.duration },
		),
	warning: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="warning"
				/>
			),
			{ duration: options?.duration },
		),
	info: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="info"
				/>
			),
			{ duration: options?.duration },
		),
	loading: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="loading"
				/>
			),
			{ duration: options?.duration },
		),
};

export { toast };

Object.assign(toast, {
	success: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="success"
				/>
			),
			{ duration: options?.duration },
		),
	error: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="error"
				/>
			),
			{ duration: options?.duration },
		),
	warning: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="warning"
				/>
			),
			{ duration: options?.duration },
		),
	info: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="info"
				/>
			),
			{ duration: options?.duration },
		),
	loading: (title: string, options?: ToastOptions) =>
		toast.custom(
			(_id) => (
				<ToastContent
					title={title}
					description={options?.description}
					type="loading"
				/>
			),
			{ duration: options?.duration },
		),
});

export function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
	return (
		<SonnerToaster
			toastOptions={{
				unstyled: true,
				...props.toastOptions,
			}}
			style={{
				...props.style,
				zIndex: 9999,
			}}
			{...props}
		/>
	);
}
