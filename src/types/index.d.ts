//Custom type declarations go here
import type { $Infer } from "@/lib/auth-client";

export type ActiveSession = typeof $Infer.Session;

export interface NavItem {
  title: string;
  url: string;
  iconName: string;
}
