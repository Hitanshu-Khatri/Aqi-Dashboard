import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center gap-2 h-10",
        caption_label: "hidden",    //hide default label since we use dropdowns
        nav: "flex items-center justify-between absolute inset-x-0 top-0 px-1",    //position nav in header
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        // Dropdown styles for month/year selection
        dropdowns: "flex gap-2 items-center",
        dropdown: "appearance-none bg-transparent border border-input rounded-md px-2 py-1 text-sm font-medium cursor-pointer hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
        dropdown_root: "relative",
        months_dropdown: "appearance-none bg-transparent border border-input rounded-md px-2 py-1 text-sm font-medium cursor-pointer hover:bg-accent",
        years_dropdown: "appearance-none bg-transparent border border-input rounded-md px-2 py-1 text-sm font-medium cursor-pointer hover:bg-accent",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "grid grid-cols-7",    //v9: weekdays instead of head_row
        weekday: "text-muted-foreground rounded-md h-9 w-9 font-normal text-[0.8rem] text-center flex items-center justify-center",    //v9: weekday instead of head_cell
        week: "grid grid-cols-7 mt-2",    //v9: week instead of row
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",    //v9: day is the cell container
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"    //v9: day_button instead of day for the clickable button
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        PreviousMonthButton: (props) => (
          <button {...props} className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
        ),
        NextMonthButton: (props) => (
          <button {...props} className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}>
            <ChevronRight className="h-4 w-4" />
          </button>
        ),
      }}
      captionLayout="dropdown"    //enables dropdown to select month and year
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
