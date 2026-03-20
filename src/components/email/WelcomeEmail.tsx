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

const WelcomeEmail = () => {
	return (
		<Html>
			<Head />
			<Preview>
				Welcome to Air War Trail Premium - Unlimited Access Awaits!
			</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-10 max-w-116.25 rounded border border-solid border-stone-300 bg-stone-100">
						<Section>
							<Row className="bg-[#a9bc98] py-6">
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
									<Img
										alt="Welcome Banner Graphic"
										width="360"
										src="https://assets.airwartrail.com/static/welcome-graphic.png"
									/>
								</Column>
							</Row>
						</Section>

						<Section className="mb-6">
							<Row>
								<Column className="text-center">
									<Text className="text-center text-2xl font-bold text-stone-900 mb-4">
										Welcome to the Air War Trail! 🎉
									</Text>
									<Text className="text-lg text-stone-700 mb-6">
										Thank you for subscribing to our{" "}
										<strong>Premium Plan</strong>
									</Text>
									<Text className="text-base text-stone-700 mb-4">
										You now have unlimited access to all premium and bonus
										content, including:
									</Text>

									{/* Benefits list */}
									<Section className="text-left max-w-96 mx-auto mb-6">
										<Text className="text-base text-stone-700 mb-2">
											✈️ <strong>Exclusive Premium Episodes</strong> - Deep dives
											into aviation history
										</Text>
										<Text className="text-base text-stone-700 mb-2">
											📚 <strong>Bonus Historical Materials</strong> - Extended
											interviews and rare footage
										</Text>
										<Text className="text-base text-stone-700 mb-2">
											🎧 <strong>Ad-Free Experience</strong> - Uninterrupted
											viewing pleasure
										</Text>
										<Text className="text-base text-stone-700">
											⚡ <strong>Early Access</strong> - New content before
											anyone else
										</Text>
									</Section>

									<Button
										className="box-border w-full max-w-80 rounded-[8px] bg-green-800 p-4 font-semibold text-white mb-4"
										href="https://www.airwartrail.com/streaming/premium"
									>
										Start Exploring Premium Content
									</Button>

									<Button
										className="box-border w-full max-w-56 rounded-[8px] bg-blue-800 p-4 font-semibold text-white mb-4"
										href="https://www.airwartrail.com/account"
									>
										Manage Your Account
									</Button>

									<Text className="text-sm text-stone-600">
										Your premium access is now active and ready to use!
									</Text>
								</Column>
							</Row>
						</Section>

						<Section className="my-6 text-center">
							<Row>
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

export default WelcomeEmail;
