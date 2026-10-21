type Props = { label: string; value: number };
export default function MetricCard({ label, value }: Props) { return <article><small>{label}</small><b>{value}</b></article>; }
