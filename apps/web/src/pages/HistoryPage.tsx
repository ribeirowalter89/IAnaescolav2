import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  BarElement
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { api } from "../services/api";
import type { Guardian } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement);

type Props = {
  guardian: Guardian;
};

export function HistoryPage({ guardian }: Props) {
  const { childId } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!childId) return;
    api
      .get(`/history/${childId}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Erro ao carregar histórico."));
  }, [childId]);

  const lineData = useMemo(() => {
    if (!data) return null;
    return {
      labels: data.progression.map((item: any) => new Date(item.date).toLocaleDateString("pt-BR")),
      datasets: [
        {
          label: "Pontuação (%)",
          data: data.progression.map((item: any) => item.scorePercent),
          borderColor: "#00796b",
          backgroundColor: "rgba(0,121,107,0.2)",
          tension: 0.3
        }
      ]
    };
  }, [data]);

  const subjectMap = useMemo(() => {
    if (!data) return {} as Record<string, number[]>;
    return data.progression.reduce((acc: Record<string, number[]>, item: any) => {
      if (!acc[item.subject]) acc[item.subject] = [];
      acc[item.subject].push(item.scorePercent);
      return acc;
    }, {});
  }, [data]);

  const barData = useMemo(() => {
    const labels = Object.keys(subjectMap);
    return {
      labels,
      datasets: [
        {
          label: "Média por matéria",
          data: labels.map((label) => {
            const scores = subjectMap[label];
            return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
          }),
          backgroundColor: "#ffb300"
        }
      ]
    };
  }, [subjectMap]);

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <h1>Histórico de desempenho</h1>
          <p>Responsável: {guardian.fullName}</p>
        </div>
        <Link className="ghost-btn" to={`/study/${childId}`}>
          Voltar ao estudo
        </Link>
      </header>

      {error && <p className="error-box">{error}</p>}

      {data && (
        <>
          <section className="card-row">
            <article className="card metric">
              <h3>Testes realizados</h3>
              <p>{data.metrics.totalTests}</p>
            </article>
            <article className="card metric">
              <h3>Média geral</h3>
              <p>{data.metrics.averageScore}%</p>
            </article>
            <article className="card metric">
              <h3>Melhor resultado</h3>
              <p>{data.metrics.bestScore}%</p>
            </article>
          </section>

          <section className="grid-cards">
            <article className="card">
              <h3>Progressão</h3>
              {lineData && <Line data={lineData} />}
            </article>
            <article className="card">
              <h3>Comparativo por matéria</h3>
              <Bar data={barData} />
            </article>
          </section>
        </>
      )}
    </main>
  );
}