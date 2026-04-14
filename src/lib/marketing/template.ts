const PLACEHOLDER_KEYS = [
  'lastLocation',
  'totalTrips',
  'tripsUntil25',
  'loyaltyLine',
] as const;

export type WhatsappTemplateVars = {
  lastLocation: string;
  totalTrips: number;
  tripsUntil25: number;
  loyaltyLine: string;
};

export function getDefaultWhatsappTemplate(): string {
  return `Hey there! / Molo! 👋

Enkosi kakhulu / *Thank you so much* for choosing *Sunshine Cabs* for your ride to *{{lastLocation}}*. 🚕✨

Siyazi iveki liphela libizwa kakhulu / *We know weekends get hectic* — errands, imicimbi, kunye nezinto ezininzi. 💨

Xa ufuna iteksi kwakhona, *qhagamshelana nathi* / *whenever you need a cab again, reach out to us* — sikulungele 24/7 (ngexesha elisebenzayo). 📲

{{loyaltyLine}}

*Izinyanya ezithembekileyo* / *Reliable drivers*, *amanani acacileyo* / *fair prices*, kunye *nenkqubo elula* / *and a simple booking flow* — siyakuthanda ukukubona kwakhona. 💛

🎁 *Ukuxelela umhlobo* / *Refer a friend*: xa bethatha uhambo nathi, *ufumene i-50% kwihambo yakho elandelayo* / *you get 50% off your next trip*. Yabelana ngeNombolo yethu / *Share our number*!

Hamba kakuhle / *Travel safe* — *Sunshine Cabs* ☀️🚖

(Trips so far / *Uhambo lwakho*: {{totalTrips}})`;
}

export function buildLoyaltyLine(
  totalTrips: number,
  threshold: number,
  tripsUntil25: number,
): string {
  // if (totalTrips >= threshold) {
  //   return (
  //     "🌟 *Wena sele uyifumene idisikhonti ye-25%* / *You already qualify for our 25% loyalty discount* " +
  //     "kwamanye amahambo / *on qualifying rides* — buza kuthi xa ubhukisha / *ask us when you book*."
  //   );
  // }
  // if (tripsUntil25 <= 0) {
  //   return (
  //     "🌟 *Usecaleni kwe-25%* / *You are close to 25% off* — *thethe nathi* / *chat to us* " +
  //     "ukuba uyiqinisekise / *to confirm* idisikhonti yakho / *your discount*."
  //   );
  // }
  const n = tripsUntil25;
  return (
    `📊 *Kusele uhambe iitrip eziy ${n}*` +
    'ngaphambi kokuba ufumane i 30% discount on your next trip . ' +
    '*So Keep on riding* with us!'
  );
}

export function applyWhatsappTemplate(
  template: string,
  vars: WhatsappTemplateVars,
): string {
  let out = template;
  for (const key of PLACEHOLDER_KEYS) {
    const token = `{{${key}}}`;
    const value =
      key === 'totalTrips' || key === 'tripsUntil25'
        ? String(vars[key])
        : String(vars[key as 'lastLocation' | 'loyaltyLine']);
    out = out.split(token).join(value);
  }
  return out;
}
