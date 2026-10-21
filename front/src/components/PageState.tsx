export default function PageState({ loading, error }: { loading: boolean; error: string }) { if (loading) return <p>Cargando...</p>; if (error) return <p className="error">{error}</p>; return null; }
