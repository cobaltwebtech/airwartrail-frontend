import {
	Tailwind,
	Html,
	Head,
	Preview,
	Body,
	Heading,
	Container,
	Section,
	Img,
	Link,
	Text,
	Row,
	Column,
	Button,
} from "@react-email/components";
import type * as React from "react";

interface ConfirmChangeProps {
	newEmail: string;
	url: string;
}

export const ConfirmChange: React.FC<ConfirmChangeProps> = ({
	newEmail,
	url,
}) => {
	return (
		<Html>
			<Head />
			<Preview>Confirm Email Change</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-[40px] max-w-[465px] rounded border border-solid border-stone-300 bg-stone-100 p-[20px]">
						<Section className="my-[20px] px-[32px] py-[20px]">
							<Row>
								<Column align="center">
									<Link href="https://www.airwartrail.com/">
										<Img
											alt="Air War Trail Logo"
											height="150"
											src="https://airwartrail-assets.b-cdn.net/email-assets/Airwar-Trail-Logo.png"
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
						<Section className="mb-[24px]">
							<Row>
								<Column className="text-center">
									<Text className="text-center text-xl font-bold text-stone-900">
										Please Confirm Your Email Change
									</Text>
									<Text className="text-sm text-stone-700">
										You requested to change your email address to:
									</Text>
									<Text className="text-base font-bold text-stone-700">
										{newEmail}
									</Text>
									<Text className="text-sm text-stone-700">
										If you did not request this change, please ignore this
										email.
									</Text>
									<Text className="text-base text-stone-700">
										Click the link below to verify.
									</Text>
									<Button
										className="box-border w-full max-w-[200px] rounded-[8px] bg-green-800 p-3 font-semibold text-white"
										href={url}
									>
										Confirm Email Change
									</Button>
									<Text className="text-base text-stone-700">
										Link will expire in five minutes.
									</Text>
								</Column>
							</Row>
						</Section>
						<Section className="my-[24px] py-[24px] text-center">
							<Row className="mt-[24px]">
								<Column className="text-center">
									<Img
										alt="Air War Trail Logo"
										width="80"
										src="https://airwartrail-assets.b-cdn.net/email-assets/Airwar-Trail-Logo.png"
										className="mx-auto w-[80px]"
									/>
								</Column>
							</Row>
							<Row className="my-[12px]">
								<Column className="text-center">
									<Link href="http://www.youtube.com/@airwartrail">
										<Img
											alt="YouTube logo"
											height="64"
											src="https://airwartrail-assets.b-cdn.net/email-assets/youtube-dark-icon.png"
											width="64"
											className="mx-auto"
										/>
										<span className="text-[12px]">Check us out on YouTube</span>
									</Link>
								</Column>
							</Row>
							<Row className="my-[12px]">
								<Column className="text-center">
									<Text className="my-[8px] text-[12px] leading-[24px] text-stone-500">
										Air War Trail is a subsidiary of Old Segundo Productions
									</Text>
									<Text className="mt-[4px] mb-0 text-[12px] leading-[24px] font-semibold text-stone-500">
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
