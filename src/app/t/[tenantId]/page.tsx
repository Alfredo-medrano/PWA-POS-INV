"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const App = dynamic(() => import("../../App"), { ssr: false });

export default function TenantAppPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  return <App tenantId={tenantId} />;
}
