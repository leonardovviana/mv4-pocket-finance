import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { PayablesSection } from "@/components/PayablesSection";
import { RoleGate } from "@/components/RoleGate";
import { PayablesCharts, PayablesReport } from "@/components/analytics/PayablesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function ContasAPagar() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_contas_a_pagar_${user.id}` : "chuvinha_page_contas_a_pagar";

  return (
    <RoleGate allow={["admin"]} redirectTo="/dashboard">
      <IOSPage title="Contas a pagar">
        <MonthFilter />
        <PageInsightsTabs
          data={<PayablesSection showMonthFilter={false} />}
          charts={<PayablesCharts />}
          report={<PayablesReport />}
          ai={
            <ChuvinhaChatPanel
              storageKey={storageKey}
              context={{ page: "Contas a pagar", month: selectedMonth }}
              placeholder='Ex: "Tem contas atrasadas?"'
            />
          }
        />
      </IOSPage>
    </RoleGate>
  );
}
