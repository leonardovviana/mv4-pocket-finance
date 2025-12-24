import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function MelhoresDoAno() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_melhores_do_ano_${user.id}` : "chuvinha_page_melhores_do_ano";

  return (
    <IOSPage title="Melhores do Ano MV4">
      <MonthFilter />
      <PageInsightsTabs
        data={<ServiceEntriesSection service="melhores_do_ano" showMonthFilter={false} />}
        charts={<ServiceEntriesCharts service="melhores_do_ano" />}
        report={<ServiceEntriesReport service="melhores_do_ano" />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Melhores do Ano", service: "melhores_do_ano", month: selectedMonth }}
            placeholder='Ex: "Qual foi o melhor dia do mês?"'
          />
        }
      />
    </IOSPage>
  );
}
