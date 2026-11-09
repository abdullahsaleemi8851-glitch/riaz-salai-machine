insert into public.categories (slug, name_en, name_ur, display_order)
values
  ('juki-machines', 'Juki Machines', 'جُوکی مشینیں', 1),
  ('simple-sewing-machines', 'Simple Sewing Machines', 'سادہ سلائی مشینیں', 2),
  ('overlock-machines', 'Overlock Machines', 'اوورلاک مشینیں', 3),
  ('disc-embroidery-machines', 'Disc Embroidery Machines', 'ڈسک کڑھائی مشینیں', 4),
  ('103k-machines', '103K Machines', '103K مشینیں', 5),
  ('singer-machines', 'Singer Machines', 'سنگر مشینیں', 6),
  ('janome-machines', 'Janome Machines', 'جینوم مشینیں', 7),
  ('other-spare-parts', 'Other Spare Parts', 'دیگر پرزے', 8)
on conflict (slug) do nothing;
