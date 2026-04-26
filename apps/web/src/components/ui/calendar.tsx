import { DayPicker, type DayPickerProps } from "react-day-picker";
import { es } from "react-day-picker/locale";
import * as React from "react";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = DayPickerProps;

/** Calendario (react-day-picker v9, locale es, estilos del paquete). */
function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn("p-2", className)}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
