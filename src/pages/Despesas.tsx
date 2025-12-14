import { ExpensesSection } from "@/components/ExpensesSection";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";

export default function Despesas() {
  return (
    <IOSPage title="Despesas">
      <MonthFilter />
      <ExpensesSection />
    </IOSPage>
  );
}
