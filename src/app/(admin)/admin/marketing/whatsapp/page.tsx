import { getDefaultWhatsappTemplate } from "@/lib/marketing/template";

import { WhatsappCampaignClient } from "./whatsapp-campaign-client";

export const dynamic = "force-dynamic";

export default function AdminWhatsappMarketingPage() {
  return (
    <div className="p-1">
      <WhatsappCampaignClient defaultTemplate={getDefaultWhatsappTemplate()} />
    </div>
  );
}
