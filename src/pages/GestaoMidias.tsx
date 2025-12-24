import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function GestaoMidias() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_gestao_midias_${user.id}` : "chuvinha_page_gestao_midias";

  return (
    <IOSPage title="Gestão de Mídias Sociais MV4">
      <MonthFilter />
      <PageInsightsTabs
        data={<ServiceEntriesSection service="gestao_midias" showMonthFilter={false} />}
        charts={<ServiceEntriesCharts service="gestao_midias" />}
        report={<ServiceEntriesReport service="gestao_midias" />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Gestão de Mídias", service: "gestao_midias", month: selectedMonth }}
            placeholder='Ex: "Quais plataformas deram mais retorno?"'
          />
        }
      />
    </IOSPage>
  );
}
