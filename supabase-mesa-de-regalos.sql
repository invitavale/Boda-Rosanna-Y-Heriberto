-- =========================================================
-- Mesa de regalos · Rosanna & Heriberto
-- Pegar completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin problema.
-- =========================================================

-- 1) Catálogo de regalos (los id coinciden con java2.js)
create table if not exists public.gift_items (
    id        text primary key,
    category  text not null,
    name      text not null,
    position  int  not null
);

-- 2) Reservas: un regalo solo puede reservarse UNA vez (primary key)
create table if not exists public.gift_claims (
    item_id     text primary key references public.gift_items(id) on delete cascade,
    guest_name  text not null check (char_length(btrim(guest_name)) between 2 and 80),
    created_at  timestamptz not null default now()
);

-- 3) Seguridad: nadie entra directo a las tablas desde la web.
--    Los invitados solo usan las dos funciones de abajo.
alter table public.gift_items  enable row level security;
alter table public.gift_claims enable row level security;
revoke all on public.gift_items, public.gift_claims from anon, authenticated;

-- 4) Datos del catálogo
insert into public.gift_items (id, category, name, position) values
    ('sala-alfombra', 'Sala / Salón', 'Alfombra decorativa', 1),
    ('sala-cortinas', 'Sala / Salón', 'Cortinas (blackout o livianas)', 2),
    ('sala-lampara', 'Sala / Salón', 'Lámpara de pie o de mesa', 3),
    ('sala-cuadros', 'Sala / Salón', 'Cuadros o decoración de pared', 4),
    ('sala-almohadas', 'Sala / Salón', 'Almohadas decorativas', 5),
    ('sala-reloj', 'Sala / Salón', 'Reloj de pared', 6),
    ('cocina-vajilla', 'Cocina / Comedor', 'Juego de vajilla', 7),
    ('cocina-cubiertos', 'Cocina / Comedor', 'Cubiertos', 8),
    ('cocina-vasos', 'Cocina / Comedor', 'Vasos', 9),
    ('cocina-ollas', 'Cocina / Comedor', 'Ollas y sartenes', 10),
    ('cocina-tabla', 'Cocina / Comedor', 'Tabla de picar', 11),
    ('cocina-utensilios', 'Cocina / Comedor', 'Coladores y utensilios', 12),
    ('cocina-tuppers', 'Cocina / Comedor', 'Tuppers', 13),
    ('cocina-mantel', 'Cocina / Comedor', 'Mantel o individuales', 14),
    ('dorm-sabanas', 'Dormitorio', 'Juego de sábanas', 15),
    ('dorm-edredon', 'Dormitorio', 'Acolchado / edredón', 16),
    ('dorm-almohadas', 'Dormitorio', 'Almohadas', 17),
    ('dorm-mantas', 'Dormitorio', 'Mantas', 18),
    ('dorm-veladores', 'Dormitorio', 'Veladores / lámparas de noche', 19),
    ('dorm-perchero', 'Dormitorio', 'Perchero u organizador de ropa', 20),
    ('bano-toallas', 'Baño', 'Juegos de toallas', 21),
    ('bano-alfombra', 'Baño', 'Alfombra de baño', 22),
    ('bano-cortina', 'Baño', 'Cortina de ducha', 23),
    ('bano-accesorios', 'Baño', 'Accesorios de baño', 24),
    ('bano-espejo', 'Baño', 'Espejo decorativo', 25),
    ('bano-canasto', 'Baño', 'Canasto de ropa', 26),
    ('deco-plantas', 'Decoración y detalles', 'Plantas naturales o artificiales', 27),
    ('deco-jarrones', 'Decoración y detalles', 'Jarrones', 28),
    ('deco-marcos', 'Decoración y detalles', 'Marcos de fotos', 29),
    ('deco-velas', 'Decoración y detalles', 'Velas aromáticas', 30),
    ('deco-difusores', 'Decoración y detalles', 'Difusores de aroma', 31),
    ('deco-cuadros', 'Decoración y detalles', 'Cuadros personalizados', 32),
    ('electro-microondas', 'Electrodomésticos', 'Microondas', 33),
    ('electro-horno', 'Electrodomésticos', 'Horno eléctrico', 34),
    ('electro-tostadora', 'Electrodomésticos', 'Tostadora', 35),
    ('electro-licuadora', 'Electrodomésticos', 'Licuadora', 36),
    ('electro-jarra', 'Electrodomésticos', 'Jarra eléctrica', 37),
    ('electro-batidora', 'Electrodomésticos', 'Batidora', 38),
    ('electro-cafetera', 'Electrodomésticos', 'Cafetera', 39),
    ('electro-aire', 'Electrodomésticos', 'Aire acondicionado o ventilador', 40)
on conflict (id) do update
    set category = excluded.category, name = excluded.name, position = excluded.position;

-- 5) Qué regalos ya están reservados (solo los id, sin nombres)
create or replace function public.get_claimed_gifts()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(jsonb_agg(item_id order by item_id), '[]'::jsonb) from public.gift_claims;
$$;

-- 6) Reservar un regalo. Si dos personas lo eligen al mismo tiempo,
--    la base de datos garantiza que solo una lo consigue.
create or replace function public.claim_gift(p_item_id text, p_guest_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_name text := regexp_replace(btrim(coalesce(p_guest_name, '')), '\s+', ' ', 'g');
begin
    if char_length(v_name) < 2 or char_length(v_name) > 80 then
        return jsonb_build_object('ok', false, 'reason', 'invalid_name');
    end if;
    if not exists (select 1 from public.gift_items where id = p_item_id) then
        return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;

    insert into public.gift_claims (item_id, guest_name)
    values (p_item_id, v_name)
    on conflict (item_id) do nothing;

    if found then
        return jsonb_build_object('ok', true);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'taken');
end;
$$;

revoke all on function public.get_claimed_gifts()            from public;
revoke all on function public.claim_gift(text, text)         from public;
grant execute on function public.get_claimed_gifts()         to anon, authenticated;
grant execute on function public.claim_gift(text, text)      to anon, authenticated;

-- =========================================================
-- Para los novios (ejecutar en el SQL Editor cuando quieran):
--
-- Ver quién reservó qué:
--   select i.category, i.name, c.guest_name, c.created_at
--   from public.gift_claims c join public.gift_items i on i.id = c.item_id
--   order by i.position;
--
-- Liberar un regalo (si alguien se equivocó):
--   delete from public.gift_claims where item_id = 'cocina-vajilla';
-- =========================================================
