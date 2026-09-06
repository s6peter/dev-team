"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const baseId = useId();
  const buttonId = `${baseId}-button-${index}`;
  const panelId = `${baseId}-panel-${index}`;

  return (
    <div className="border-b border-border">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="text-base font-medium text-foreground sm:text-lg">
            {item.question}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 flex-shrink-0 text-brand-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className="pb-5 pr-9 text-sm leading-7 text-muted-foreground sm:text-base"
      >
        {item.answer}
      </div>
    </div>
  );
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-border">
      {items.map((item, index) => (
        <FaqRow key={item.question} item={item} index={index} />
      ))}
    </div>
  );
}
