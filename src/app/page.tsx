import { Suspense } from "react";
import AgencyTable from "@/components/AgencyTable";

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <AgencyTable />
    </Suspense>
  );
}
