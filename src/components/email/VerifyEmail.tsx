import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import type * as React from "react";

interface VerifyEmailProps {
	url: string;
}

export const VerifyEmail: React.FC<VerifyEmailProps> = ({ url }) => {
	return (
		<Html>
			<Head />
			<Preview>Verify Your Email</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-10 max-w-116.25 rounded border border-solid border-stone-300 bg-stone-100 p-5">
						<Section className="my-5 px-8 py-5">
							<Row>
								<Column align="center">
									<Link href="https://www.airwartrail.com/">
										<Img
											alt="Air War Trail Logo"
											height="150"
											src="https://assets.airwartrail.com/static/Airwar-Trail-Logo.png"
										/>
									</Link>
									<Heading as="h1" className="text-4xl">
										Air War Trail
									</Heading>
								</Column>
							</Row>
							<Row>
								<Column align="center">
									<Link
										className="text-stone-600 [text-decoration:none]"
										href="#"
									>
										Episodes
									</Link>
								</Column>
								<Column align="center">
									<Link
										className="text-stone-600 [text-decoration:none]"
										href="#"
									>
										About
									</Link>
								</Column>
								<Column align="center">
									<Link
										className="text-stone-600 [text-decoration:none]"
										href="#"
									>
										Account
									</Link>
								</Column>
							</Row>
						</Section>
						<Section className="mb-6">
							<Row>
								<Column className="text-center">
									<Text className="text-center text-xl font-bold text-stone-900">
										Please Verify Your Email Address
									</Text>
									<Text className="text-base text-stone-700">
										Click the link below to verify.
									</Text>
									<Button
										className="box-border w-full max-w-50 rounded-[8px] bg-green-800 p-3 font-semibold text-white"
										href={url}
									>
										Verify Email Address
									</Button>
									<Text className="text-base text-stone-700">
										Link will expire in thirty minutes.
									</Text>
								</Column>
							</Row>
						</Section>
						<Section className="my-6 py-6 text-center">
							<Row className="mt-6">
								<Column className="text-center">
									<Img
										alt="Air War Trail Logo"
										width="80"
										src="https://assets.airwartrail.com/static/Airwar-Trail-Logo.png"
										className="mx-auto w-20"
									/>
								</Column>
							</Row>
							<Row className="my-3">
								<Column className="text-center">
									<Link href="http://www.youtube.com/@airwartrail">
										<Img
											alt="YouTube logo"
											height="64"
											src="https://assets.airwartrail.com/static/YouTube-Logo-Dark.png"
											width="64"
											className="mx-auto"
										/>
										<span className="text-[12px]">Check us out on YouTube</span>
									</Link>
								</Column>
							</Row>
							<Row className="my-3">
								<Column className="text-center">
									<Text className="my-2 text-[12px] leading-6 text-stone-500">
										Air War Trail is a subsidiary of Old Segundo Productions
									</Text>
									<Text className="mt-1 mb-0 text-[12px] leading-6 font-semibold text-stone-500">
										<Link href="mailto:info@airwartrail.com">
											info@airwartrail.com
										</Link>
									</Text>
								</Column>
							</Row>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};
