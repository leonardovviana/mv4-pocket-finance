import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export function MonthFilter() {
  const { selectedMonth, setSelectedMonth, monthOptions } = useMonthFilter();

  return (
    <div className="flex items-center justify-between">
      <span className="ios-caption1 text-muted-foreground">Mês</span>
      <div className="w-[160px]">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
