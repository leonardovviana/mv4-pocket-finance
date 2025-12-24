import { IOSCard } from "@/components/IOSCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PageInsightsTabs(props: {
  defaultValue?: "dados" | "graficos" | "relatorio" | "ia";
  labels?: Partial<Record<"dados" | "graficos" | "relatorio" | "ia", string>>;
  data: React.ReactNode;
  charts?: React.ReactNode;
  report?: React.ReactNode;
  ai?: React.ReactNode;
}) {
  const labels = {
    dados: "Dados",
    graficos: "Gráficos",
    relatorio: "Relatório",
    ia: "IA",
    ...(props.labels ?? {}),
  };

  const empty = (text: string) => (
    <IOSCard className="p-4">
      <div className="text-sm text-muted-foreground">{text}</div>
    </IOSCard>
  );

  return (
    <Tabs defaultValue={props.defaultValue ?? "dados"}>
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="dados">{labels.dados}</TabsTrigger>
        <TabsTrigger value="graficos">{labels.graficos}</TabsTrigger>
        <TabsTrigger value="relatorio">{labels.relatorio}</TabsTrigger>
        <TabsTrigger value="ia">{labels.ia}</TabsTrigger>
      </TabsList>

      <TabsContent value="dados">{props.data}</TabsContent>
      <TabsContent value="graficos">{props.charts ?? empty("Sem gráficos para esta aba ainda.")}</TabsContent>
      <TabsContent value="relatorio">{props.report ?? empty("Sem relatório para esta aba ainda.")}</TabsContent>
      <TabsContent value="ia">{props.ai ?? empty("Sem IA para esta aba ainda.")}</TabsContent>
    </Tabs>
  );
}
