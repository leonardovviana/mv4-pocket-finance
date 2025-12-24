import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function RevistaFactus() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_revista_factus_${user.id}` : "chuvinha_page_revista_factus";

  return (
    <IOSPage title="Revista Factus">
      <MonthFilter />
      <PageInsightsTabs
        data={<ServiceEntriesSection service="revista_factus" showMonthFilter={false} />}
        charts={<ServiceEntriesCharts service="revista_factus" />}
        report={<ServiceEntriesReport service="revista_factus" />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Revista Factus", service: "revista_factus", month: selectedMonth }}
            placeholder='Ex: "Quais edições renderam mais?"'
          />
        }
      />
    </IOSPage>
  );
}
