import { useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { COUNTRIES, GLOBAL_COUNTRY, flagFor, countryLabel } from "@/lib/countries";

/**
 * Searchable country picker. `value` is the stored string — a country name or
 * the GLOBAL_COUNTRY sentinel — so it slots straight into `profiles.country`
 * and `foods.country` without any mapping.
 */
export function CountrySelect({
  value,
  onChange,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isGlobal = !value || value.toLowerCase() === GLOBAL_COUNTRY;

  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 font-normal", className)}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-base leading-none">{flagFor(value)}</span>
            <span className="truncate">{countryLabel(value)}</span>
          </span>
          <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[15rem] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="Global Other Worldwide" onSelect={() => select(GLOBAL_COUNTRY)}>
                <Globe className="size-4 mr-2 text-muted-foreground" />
                Global / Other
                <Check className={cn("ml-auto size-4", isGlobal ? "opacity-100" : "opacity-0")} />
              </CommandItem>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => select(c.name)}
                >
                  <span className="text-base mr-2 leading-none">{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      value?.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
