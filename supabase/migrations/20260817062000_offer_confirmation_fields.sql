alter table public.candidate_offers
  add column if not exists ctc_confirm_method text
    check (ctc_confirm_method in ('physical_sign','email','whatsapp','verbal')),
  add column if not exists offer_confirm_notes text;
