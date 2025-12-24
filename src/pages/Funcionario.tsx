import { ChuvinhaChatPanel } from "@/components/ChuvinhaChatPanel";
import { IOSPage } from "@/components/IOSPage";
import { MonthFilter } from "@/components/MonthFilter";
import { PageInsightsTabs } from "@/components/PageInsightsTabs";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";
import { ServiceEntriesCharts, ServiceEntriesReport } from "@/components/analytics/ServiceEntriesAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import { SERVICE_LABEL, type ServiceKey } from "@/lib/domain";
import { useMemo, useState } from "react";

export default function Funcionario() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();

  const services: ServiceKey[] = [
    "gestao_midias",
    "carro_de_som",
    "revista_factus",
    "revista_saude",
    "melhores_do_ano",
    "premio_excelencia",
    "servicos_variados",
  ];

  const [activeService, setActiveService] = useState<ServiceKey>(services[0]);

  const storageKey = useMemo(
    () => (user ? `chuvinha_page_funcionario_${activeService}_${user.id}` : `chuvinha_page_funcionario_${activeService}`),
    [user, activeService],
  );

  return (
    <IOSPage title="Meus lançamentos">
      <MonthFilter />
      <PageInsightsTabs
        data={
          <Tabs value={activeService} onValueChange={(v) => setActiveService(v as ServiceKey)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {services.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {SERVICE_LABEL[s]}
                </TabsTrigger>
              ))}
            </TabsList>

            {services.map((s) => (
              <TabsContent key={s} value={s}>
                <ServiceEntriesSection service={s} showMonthFilter={false} />
              </TabsContent>
            ))}
          </Tabs>
        }
        charts={<ServiceEntriesCharts service={activeService} />}
        report={<ServiceEntriesReport service={activeService} />}
        ai={
          <ChuvinhaChatPanel
            storageKey={storageKey}
            context={{ page: "Meus lançamentos", service: activeService, month: selectedMonth }}
            placeholder='Ex: "O que está em aberto nesse serviço?"'
          />
        }
      />
    </IOSPage>
  );
}
