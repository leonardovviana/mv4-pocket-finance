import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function PremioExcelencia() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_premio_excelencia_${user.id}` : "chuvinha_page_premio_excelencia";

  return (
    <IOSPage title="Prêmio Excelência MV4">
      <MonthFilter />
      <PageInsightsTabs
        data={<ServiceEntriesSection service="premio_excelencia" showMonthFilter={false} />}
        charts={<ServiceEntriesCharts service="premio_excelencia" />}
        report={<ServiceEntriesReport service="premio_excelencia" />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Prêmio Excelência", service: "premio_excelencia", month: selectedMonth }}
            placeholder='Ex: "Tem tendência de alta nesse mês?"'
          />
        }
      />
    </IOSPage>
  );
}
