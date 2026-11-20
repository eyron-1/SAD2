-- Allow barangay/SK editors to delete resolved feedback records.
-- This policy complements the existing feedback update policy.

drop policy if exists "officials delete feedback" on feedback;

create policy "officials delete feedback" on feedback for delete using (
  status in ('resolved', 'closed')
  and belongs_to_barangay(auth.uid(), barangay_id)
  and (
    (addressed_to = 'barangay' and is_barangay_editor(auth.uid()))
    or (addressed_to = 'sk' and is_sk_editor(auth.uid()))
  )
);
