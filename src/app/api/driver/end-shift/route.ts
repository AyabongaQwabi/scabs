import { jsonDriverPost } from "@/lib/driver/json-driver-post";
import { endShiftMutation } from "@/lib/driver/mutations";

export async function POST(req: Request) {
  return jsonDriverPost(req, endShiftMutation);
}

