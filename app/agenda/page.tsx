import type { Metadata } from "next";
import AgendaClient from "./agenda-client";

export const metadata: Metadata = {
  title: "Agenda esportiva | Pulso TV",
  description: "Acompanhe eventos ao vivo, próximos jogos e transmissões encerradas.",
};

export default function AgendaPage() {
  return <AgendaClient />;
}
