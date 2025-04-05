import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section className="px-4 py-12 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Free Plan */}
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Get started with basic features</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="mb-6 text-3xl font-bold">
                $0
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="mr-2 size-5 text-green-500" />
                  Feature one placeholder
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 size-5 text-green-500" />
                  Feature two placeholder
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 size-5 text-green-500" />
                  Feature three placeholder
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Get Started</Button>
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="border-primary flex h-full flex-col border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Premium</CardTitle>
              <CardDescription>Everything you need and more</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="mb-6 text-3xl font-bold">
                $9
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="mr-2 size-5 text-green-500" />
                  All free features plus...
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 size-5 text-green-500" />
                  Premium feature one placeholder
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 size-5 text-green-500" />
                  Premium feature two placeholder
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 size-5 text-green-500" />
                  Premium feature three placeholder
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Subscribe Now</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
