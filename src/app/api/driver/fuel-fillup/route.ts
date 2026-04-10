import { jsonDriverPost } from "@/lib/driver/json-driver-post";
import { addFuelFillupMutation } from "@/lib/driver/mutations";

export async function POST(req: Request) {
  return jsonDriverPost(req, addFuelFillupMutation);
}

