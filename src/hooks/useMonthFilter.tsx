import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type MonthOption = { value: string; label: string };

type MonthFilterContextValue = {
  selectedMonth: string; // yyyy-MM
  setSelectedMonth: (value: string) => void;
  monthOptions: MonthOption[];
};

const MonthFilterContext = createContext<MonthFilterContextValue | null>(null);

const STORAGE_KEY = "mv4-month-filter";

export function MonthFilterProvider(props: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    return format(new Date(), "yyyy-MM");
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedMonth);
  }, [selectedMonth]);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(subMonths(now, 11));
    return Array.from({ length: 12 }, (_, i) => {
      const d = addMonths(start, i);
      return {
        value: format(d, "yyyy-MM"),
        label: format(d, "MMM/yyyy", { locale: ptBR }),
      };
    }).reverse();
  }, []);

  return (
    <MonthFilterContext.Provider value={{ selectedMonth, setSelectedMonth, monthOptions }}>
      {props.children}
    </MonthFilterContext.Provider>
  );
}

export function useMonthFilter() {
  const ctx = useContext(MonthFilterContext);
  if (!ctx) throw new Error("useMonthFilter must be used within MonthFilterProvider");
  return ctx;
}
