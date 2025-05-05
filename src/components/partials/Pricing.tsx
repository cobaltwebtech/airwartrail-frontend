import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, UserPlus } from "lucide-react";

export default function Pricing() {
  return (
    <section className="px-4 py-12 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
            Plan Pricing
          </h3>
          <p className="text-accent-foreground mt-4 text-lg">
            Help us continue our mission to of preserving World War II history
            by subscribing now!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
          {/* Premium Plan */}
          <Card className="border-primary flex h-full flex-col border-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl">Premium</CardTitle>
              <CardDescription>
                Access to all premium and exclusive content
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="mb-6 text-3xl font-bold">
                $9
                <sup className="superscript text-base">.99</sup>
                <span className="text-base font-normal text-gray-500">
                  &nbsp; /month
                </span>
              </p>
              <ul className="space-y-3">
                <li className="flex flex-row items-center gap-2">
                  <Check className="size-[24px] basis-1/12 text-green-500" />
                  <span className="basis-11/12">
                    All features from Basic plan plus...
                  </span>
                </li>
                <li className="flex flex-row items-center gap-2">
                  <Check className="size-[24px] basis-1/12 text-green-500" />
                  <span className="basis-11/12">
                    Full-length films, interviews, and other video presentations
                  </span>
                </li>
                <li className="flex flex-row items-center gap-2">
                  <Check className="size-[24px] basis-1/12 text-green-500" />
                  <span className="basis-11/12">
                    Bonus content of high-res photographs, historical materials,
                    War Department productions, and much more
                  </span>
                </li>
                <li className="flex flex-row items-center gap-2">
                  <Check className="size-[24px] basis-1/12 text-green-500" />
                  <span className="basis-11/12">
                    Access to episodes and content early before everyone else
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <a href="/signup" className="w-full">
                <Button className="w-full" size="lg">
                  <UserPlus className="size-6" />
                  <span className="text-lg font-bold">
                    Subscribe to Premium
                  </span>
                </Button>
              </a>
            </CardFooter>
          </Card>

          {/* Free Plan */}
          <Card className="flex h-full flex-col lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-2xl">Basic</CardTitle>
              <CardDescription>Get started with our entry plan</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="mb-6 text-3xl font-bold">
                $0
                <span className="text-base font-normal text-gray-500">
                  &nbsp;/month
                </span>
              </p>
              <ul className="space-y-3">
                <li className="flex flex-row items-center gap-2">
                  <Check className="size-[24px] basis-1/12 text-green-500" />
                  <span className="basis-11/12">
                    Bi-weekly release of episodes and other content
                  </span>
                </li>
                <li className="flex flex-row items-center gap-2">
                  <Check className="size-[24px] basis-1/12 text-green-500" />
                  <span className="basis-11/12">
                    Sneak previews of documentary films
                  </span>
                </li>
                <li className="flex flex-row items-center gap-2">
                  <Check className="size-[24px] basis-1/12 text-green-500" />
                  <span className="basis-11/12">
                    Sneak previews of interviews of WWII individuals
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <a href="/signup" className="w-full">
                <Button className="w-full" variant="secondary">
                  Get Started
                </Button>
              </a>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
