import CompareSetup from "@/components/CompareSetup";

type Props = { subpouleId: string; gameId?: string };

export default function SubpouleBenchmark({ subpouleId, gameId }: Props) {
  return <CompareSetup gameId={gameId} subpouleId={subpouleId} />;
}
