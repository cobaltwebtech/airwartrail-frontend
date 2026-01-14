import {
	Html,
	Head,
	Preview,
	Body,
	Container,
	Section,
	Text,
	Row,
	Column,
} from "@react-email/components";
import type * as React from "react";

interface ContactFormProps {
	fullName: string;
	email: string;
	phone?: string;
	message?: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({
	fullName,
	email,
	phone = "",
	message,
}) => {
	return (
		<Html>
			<Head />
			<Preview>New contact form submission</Preview>
			<Body
				style={{
					fontFamily: "Arial, sans-serif",
					margin: "0",
					padding: "0",
					backgroundColor: "#f6f9fc",
				}}
			>
				<Container
					style={{
						padding: "20px",
						margin: "0 auto",
						backgroundColor: "#ffffff",
						borderRadius: "5px",
						maxWidth: "600px",
					}}
				>
					<Section>
						<Text
							style={{ fontSize: "20px", fontWeight: "bold", color: "#333333" }}
						>
							New Contact Form Submission
						</Text>
					</Section>
					<Section>
						<Row>
							<Column>
								<Text
									style={{
										fontSize: "16px",
										marginBottom: "10px",
										color: "#555555",
									}}
								>
									<strong>Full Name:</strong> {fullName}
								</Text>
								<Text
									style={{
										fontSize: "16px",
										marginBottom: "10px",
										color: "#555555",
									}}
								>
									<strong>Email:</strong> {email}
								</Text>
								{phone && (
									<Text
										style={{
											fontSize: "16px",
											marginBottom: "10px",
											color: "#555555",
										}}
									>
										<strong>Phone:</strong> {phone}
									</Text>
								)}
								{message && (
									<Text
										style={{
											fontSize: "16px",
											marginBottom: "10px",
											color: "#555555",
										}}
									>
										<strong>Message:</strong> {message}
									</Text>
								)}
							</Column>
						</Row>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};
