import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function RevistaSaude() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_revista_saude_${user.id}` : "chuvinha_page_revista_saude";

  return (
    <IOSPage title="Revista Factus - Edição Saúde">
      <MonthFilter />
      <PageInsightsTabs
        data={<ServiceEntriesSection service="revista_saude" showMonthFilter={false} />}
        charts={<ServiceEntriesCharts service="revista_saude" />}
        report={<ServiceEntriesReport service="revista_saude" />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Revista Saúde", service: "revista_saude", month: selectedMonth }}
            placeholder='Ex: "Quais edições renderam mais?"'
          />
        }
      />
    </IOSPage>
  );
}
