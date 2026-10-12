-- =========================================================
-- Mesa de regalos · proyecto Supabase "Invitavale"
-- Ya aplicado en el proyecto nsujtmfmyoeibbvwkzez el 12-10-2026.
-- Sirve para varias invitaciones: cada una usa su propio valor de "event".
-- =========================================================

-- Mesa de regalos (reutilizable para varias invitaciones: columna event)
create table if not exists public.gift_items (
    event     text not null,
    id        text not null,
    category  text not null,
    name      text not null,
    position  int  not null,
    primary key (event, id)
);

create table if not exists public.gift_claims (
    event       text not null,
    item_id     text not null,
    created_at  timestamptz not null default now(),
    primary key (event, item_id),
    foreign key (event, item_id) references public.gift_items (event, id) on delete cascade
);

alter table public.gift_items  enable row level security;
alter table public.gift_claims enable row level security;
revoke all on public.gift_items, public.gift_claims from anon, authenticated;

create or replace function public.get_claimed_gifts(p_event text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(jsonb_agg(c.item_id order by c.item_id), '[]'::jsonb)
    from public.gift_claims c
    where c.event = p_event;
$$;

create or replace function public.claim_gift(p_event text, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not exists (select 1 from public.gift_items i where i.event = p_event and i.id = p_item_id) then
        return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;

    insert into public.gift_claims (event, item_id)
    values (p_event, p_item_id)
    on conflict (event, item_id) do nothing;

    if found then
        return jsonb_build_object('ok', true);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'taken');
end;
$$;

revoke all on function public.get_claimed_gifts(text)  from public;
revoke all on function public.claim_gift(text, text)   from public;
grant execute on function public.get_claimed_gifts(text) to anon, authenticated;
grant execute on function public.claim_gift(text, text)  to anon, authenticated;

-- Regalos de la boda de Rosanna & Heriberto
insert into public.gift_items (event, id, category, name, position) values
  ('boda-rosanna-heriberto', 'sala-alfombra', 'Sala / Salón', 'Alfombra decorativa', 1),
  ('boda-rosanna-heriberto', 'sala-cortinas', 'Sala / Salón', 'Cortinas (blackout o livianas)', 2),
  ('boda-rosanna-heriberto', 'sala-lampara', 'Sala / Salón', 'Lámpara de pie o de mesa', 3),
  ('boda-rosanna-heriberto', 'sala-cuadros', 'Sala / Salón', 'Cuadros o decoración de pared', 4),
  ('boda-rosanna-heriberto', 'sala-almohadas', 'Sala / Salón', 'Almohadas decorativas', 5),
  ('boda-rosanna-heriberto', 'sala-reloj', 'Sala / Salón', 'Reloj de pared', 6),
  ('boda-rosanna-heriberto', 'cocina-vajilla', 'Cocina / Comedor', 'Juego de vajilla', 7),
  ('boda-rosanna-heriberto', 'cocina-cubiertos', 'Cocina / Comedor', 'Cubiertos', 8),
  ('boda-rosanna-heriberto', 'cocina-vasos', 'Cocina / Comedor', 'Vasos', 9),
  ('boda-rosanna-heriberto', 'cocina-ollas', 'Cocina / Comedor', 'Ollas y sartenes', 10),
  ('boda-rosanna-heriberto', 'cocina-tabla', 'Cocina / Comedor', 'Tabla de picar', 11),
  ('boda-rosanna-heriberto', 'cocina-utensilios', 'Cocina / Comedor', 'Coladores y utensilios', 12),
  ('boda-rosanna-heriberto', 'cocina-tuppers', 'Cocina / Comedor', 'Tuppers', 13),
  ('boda-rosanna-heriberto', 'cocina-mantel', 'Cocina / Comedor', 'Mantel o individuales', 14),
  ('boda-rosanna-heriberto', 'dorm-sabanas', 'Dormitorio', 'Juego de sábanas', 15),
  ('boda-rosanna-heriberto', 'dorm-edredon', 'Dormitorio', 'Acolchado / edredón', 16),
  ('boda-rosanna-heriberto', 'dorm-almohadas', 'Dormitorio', 'Almohadas', 17),
  ('boda-rosanna-heriberto', 'dorm-mantas', 'Dormitorio', 'Mantas', 18),
  ('boda-rosanna-heriberto', 'dorm-veladores', 'Dormitorio', 'Veladores / lámparas de noche', 19),
  ('boda-rosanna-heriberto', 'dorm-perchero', 'Dormitorio', 'Perchero u organizador de ropa', 20),
  ('boda-rosanna-heriberto', 'bano-toallas', 'Baño', 'Juegos de toallas', 21),
  ('boda-rosanna-heriberto', 'bano-alfombra', 'Baño', 'Alfombra de baño', 22),
  ('boda-rosanna-heriberto', 'bano-cortina', 'Baño', 'Cortina de ducha', 23),
  ('boda-rosanna-heriberto', 'bano-accesorios', 'Baño', 'Accesorios de baño', 24),
  ('boda-rosanna-heriberto', 'bano-espejo', 'Baño', 'Espejo decorativo', 25),
  ('boda-rosanna-heriberto', 'bano-canasto', 'Baño', 'Canasto de ropa', 26),
  ('boda-rosanna-heriberto', 'deco-plantas', 'Decoración y detalles', 'Plantas naturales o artificiales', 27),
  ('boda-rosanna-heriberto', 'deco-jarrones', 'Decoración y detalles', 'Jarrones', 28),
  ('boda-rosanna-heriberto', 'deco-marcos', 'Decoración y detalles', 'Marcos de fotos', 29),
  ('boda-rosanna-heriberto', 'deco-velas', 'Decoración y detalles', 'Velas aromáticas', 30),
  ('boda-rosanna-heriberto', 'deco-difusores', 'Decoración y detalles', 'Difusores de aroma', 31),
  ('boda-rosanna-heriberto', 'deco-cuadros', 'Decoración y detalles', 'Cuadros personalizados', 32),
  ('boda-rosanna-heriberto', 'electro-microondas', 'Electrodomésticos', 'Microondas', 33),
  ('boda-rosanna-heriberto', 'electro-horno', 'Electrodomésticos', 'Horno eléctrico', 34),
  ('boda-rosanna-heriberto', 'electro-tostadora', 'Electrodomésticos', 'Tostadora', 35),
  ('boda-rosanna-heriberto', 'electro-licuadora', 'Electrodomésticos', 'Licuadora', 36),
  ('boda-rosanna-heriberto', 'electro-jarra', 'Electrodomésticos', 'Jarra eléctrica', 37),
  ('boda-rosanna-heriberto', 'electro-batidora', 'Electrodomésticos', 'Batidora', 38),
  ('boda-rosanna-heriberto', 'electro-cafetera', 'Electrodomésticos', 'Cafetera', 39),
  ('boda-rosanna-heriberto', 'electro-aire', 'Electrodomésticos', 'Aire acondicionado o ventilador', 40)
on conflict (event, id) do update set category = excluded.category, name = excluded.name, position = excluded.position;

-- =========================================================
-- Para los novios / administración (SQL Editor):
--
-- Ver qué regalos ya fueron elegidos y cuándo:
--   select i.category, i.name, c.created_at
--   from public.gift_claims c
--   join public.gift_items i on i.event = c.event and i.id = c.item_id
--   where c.event = 'boda-rosanna-heriberto'
--   order by i.position;
--
-- Liberar un regalo (si alguien se equivocó):
--   delete from public.gift_claims
--   where event = 'boda-rosanna-heriberto' and item_id = 'cocina-vajilla';
-- =========================================================
