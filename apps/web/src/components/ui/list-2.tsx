import { ArrowRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface List2Item {
  icon: React.ReactNode;
  title: string;
  category: string;
  description: string;
  link: string;
  linkTarget?: string;
  linkRel?: string;
}

export interface List2Props {
  heading?: string;
  items?: List2Item[];
  actionLabel?: string;
  className?: string;
  sectionClassName?: string;
  emptyMessage?: string;
}

export const List2 = ({
  heading,
  items = [],
  actionLabel = "Abrir",
  className,
  sectionClassName,
  emptyMessage = "No hay resultados que coincidan con la búsqueda.",
}: List2Props) => {
  return (
    <section className={cn("py-12 md:py-20", sectionClassName)}>
      <div className={cn("container mx-auto px-0 md:px-8", className)}>
        {heading != null && heading !== "" && (
          <h1 className="mb-8 px-4 text-3xl font-semibold md:mb-10 md:text-4xl">{heading}</h1>
        )}
        {items.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col">
            <Separator />
            {items.map((item, index) => (
              <React.Fragment key={`${item.link}-${item.title}-${index}`}>
                <div className="grid items-center gap-4 px-4 py-5 md:grid-cols-4">
                  <div className="order-2 flex items-center gap-2 md:order-none">
                    <span className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                      {item.icon}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 className="line-clamp-2 font-semibold leading-snug">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <p className="order-1 line-clamp-4 text-base font-semibold leading-snug text-foreground md:order-none md:col-span-2 md:text-xl">
                    {item.description}
                  </p>
                  <Button variant="outline" asChild>
                    <a
                      className="order-3 ml-auto w-fit gap-2 md:order-none"
                      href={item.link}
                      target={item.linkTarget}
                      rel={item.linkRel}
                    >
                      <span>{actionLabel}</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <Separator />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
