import { IOSPage } from "@/components/IOSPage";
import { ServiceEntriesSection } from "@/components/ServiceEntriesSection";

export default function Funcionario() {
  return (
    <IOSPage title="Meus lançamentos">
      <ServiceEntriesSection service="servicos_variados" />
    </IOSPage>
  );
}
