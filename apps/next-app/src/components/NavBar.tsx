"use client";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { BlocksIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { ModeToggle } from "./ModeToggle";
import { Profile } from "./Profile";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Marketing Page",
    href: "/marketing-page",
    description: "Write some wavy here to get them to click.",
  },
  {
    title: "Second Tab",
    href: "/",
    description: "Write some wavy here to get them to click.",
  },
  {
    title: "Third Tab",
    href: "/",
    description: "Write some wavy here to get them to click.",
  },
];

export function NavBar() {
  const { data: session } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="z-10 flex justify-between bg-white dark:bg-black p-2 border-b min-w-full">
      <div className="min-[825px]:hidden flex justify-between w-full">
        {mounted && (
          <Sheet>
            <SheetTrigger className="p-2 transition">
              <GiHamburgerMenu />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Next Starter</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-3 mt-[1rem]">
                <SheetClose asChild>
                  <Link href="/">
                    <Button variant="outline" className="w-full">
                      Home
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/dashboard"
                    legacyBehavior
                    passHref
                    className="cursor-pointer"
                  >
                    <Button variant="outline">Dashboard</Button>
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        )}
        <ModeToggle />
      </div>
      {mounted ? (
        <NavigationMenu>
          <NavigationMenuList className="max-[825px]:hidden flex justify-between gap-3 w-[100%]">
            <Link href="/" className="pl-2">
              <BlocksIcon />
            </Link>
          </NavigationMenuList>
          <NavigationMenuList>
            <NavigationMenuItem className="max-[825px]:hidden ml-5">
              <NavigationMenuTrigger>Features</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="flex flex-col gap-3 p-4 w-[400px] lg:w-[500px]">
                  {components.map((component) => (
                    <ListItem
                      key={component.title}
                      title={component.title}
                      href={component.href}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuList>
              <Link
                className="max-[825px]:hidden"
                href="https://learn.rankboost.ai"
                target="_blank"
              >
                <Button variant="ghost">Docs</Button>
              </Link>
            </NavigationMenuList>
          </NavigationMenuList>
        </NavigationMenu>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/" className="pl-2">
            <BlocksIcon />
          </Link>
        </div>
      )}
      <div className="max-[825px]:hidden flex items-center gap-3">
        <Link href="/dashboard" className="max-[825px]:hidden">
          <Button size="sm">Dashboard</Button>
        </Link>
        {session?.user && <Profile />}
        <ModeToggle />
      </div>
    </div>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block space-y-1 hover:bg-accent focus:bg-accent p-3 rounded-md outline-none no-underline leading-none transition-colors hover:text-accent-foreground focus:text-accent-foreground select-none",
            className,
          )}
          {...props}
        >
          <div className="font-medium text-sm leading-none">{title}</div>
          <p className="text-muted-foreground text-sm line-clamp-2 leading-snug">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
