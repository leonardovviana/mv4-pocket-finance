import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";

export default function ServicosVariados() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const storageKey = user ? `chuvinha_page_servicos_variados_${user.id}` : "chuvinha_page_servicos_variados";

  return (
    <IOSPage title="Serviços Variados">
      <MonthFilter />
      <PageInsightsTabs
        data={<ServiceEntriesSection service="servicos_variados" showMonthFilter={false} />}
        charts={<ServiceEntriesCharts service="servicos_variados" />}
        report={<ServiceEntriesReport service="servicos_variados" />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Serviços Variados", service: "servicos_variados", month: selectedMonth }}
            placeholder='Ex: "Quais clientes mais geraram receita?"'
          />
        }
      />
    </IOSPage>
  );
}
