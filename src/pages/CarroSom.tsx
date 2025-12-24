import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function CarroSom() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_carro_de_som_${user.id}` : "chuvinha_page_carro_de_som";

  return (
    <IOSPage title="Carro de Som">
      <MonthFilter />
      <PageInsightsTabs
        data={<ServiceEntriesSection service="carro_de_som" showMonthFilter={false} />}
        charts={<ServiceEntriesCharts service="carro_de_som" />}
        report={<ServiceEntriesReport service="carro_de_som" />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Carro de Som", service: "carro_de_som", month: selectedMonth }}
            placeholder='Ex: "Quais cidades renderam mais?"'
          />
        }
      />
    </IOSPage>
  );
}
