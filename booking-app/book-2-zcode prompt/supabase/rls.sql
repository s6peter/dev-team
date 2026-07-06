-- Enable RLS on all tables
alter table stylists enable row level security;
alter table services enable row level security;
alter table service_tiers enable row level security;
alter table availability enable row level security;
alter table availability_overrides enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table payments enable row level security;
alter table slot_holds enable row level security;
alter table reviews enable row level security;
alter table portfolio_items enable row level security;
alter table messages enable row level security;
alter table intake_responses enable row level security;

-- Stylists policies
create policy "Public can view stylists"
  on stylists for select
  using (true);

create policy "Stylists can update own profile"
  on stylists for update
  using (auth.uid() = user_id);

-- Services policies
create policy "Public can view services"
  on services for select
  using (true);

create policy "Stylists can manage own services"
  on services for all
  using (stylist_id in (
    select id from stylists where user_id = auth.uid()
  ));

-- Service tiers policies
create policy "Public can view service tiers"
  on service_tiers for select
  using (true);

create policy "Stylists can manage own service tiers"
  on service_tiers for all
  using (service_id in (
    select s.id from services s
    join stylists st on s.stylist_id = st.id
    where st.user_id = auth.uid()
  ));

-- Availability policies
create policy "Public can view availability"
  on availability for select
  using (true);

create policy "Stylists can manage own availability"
  on availability for all
  using (stylist_id in (
    select id from stylists where user_id = auth.uid()
  ));

-- Availability overrides policies
create policy "Public can view availability overrides"
  on availability_overrides for select
  using (true);

create policy "Stylists can manage own overrides"
  on availability_overrides for all
  using (stylist_id in (
    select id from stylists where user_id = auth.uid()
  ));

-- Clients policies
create policy "Clients can view own profile"
  on clients for select
  using (user_id = auth.uid());

create policy "Clients can update own profile"
  on clients for update
  using (user_id = auth.uid());

create policy "Stylists can view all clients"
  on clients for select
  using (true);

create policy "Stylists can update client notes"
  on clients for update
  using (true);

-- Appointments policies
create policy "Clients can view own appointments"
  on appointments for select
  using (client_id in (
    select id from clients where user_id = auth.uid()
  ));

create policy "Stylists can view assigned appointments"
  on appointments for select
  using (stylist_id in (
    select id from stylists where user_id = auth.uid()
  ));

create policy "Clients can create appointments"
  on appointments for insert
  with check (client_id in (
    select id from clients where user_id = auth.uid()
  ));

create policy "Stylists can update assigned appointments"
  on appointments for update
  using (stylist_id in (
    select id from stylists where user_id = auth.uid()
  ));

-- Payments policies
create policy "Clients can view own payments"
  on payments for select
  using (appointment_id in (
    select a.id from appointments a
    join clients c on a.client_id = c.id
    where c.user_id = auth.uid()
  ));

create policy "Stylists can view all payments"
  on payments for select
  using (true);

create policy "System can insert payments"
  on payments for insert
  with check (true);

create policy "System can update payments"
  on payments for update
  using (true);

-- Slot holds policies
create policy "Anyone can view slot holds"
  on slot_holds for select
  using (true);

create policy "Anyone can create slot holds"
  on slot_holds for insert
  with check (true);

create policy "Anyone can delete slot holds"
  on slot_holds for delete
  using (true);

-- Reviews policies
create policy "Public can view reviews"
  on reviews for select
  using (true);

create policy "Clients can create reviews"
  on reviews for insert
  with check (client_id in (
    select id from clients where user_id = auth.uid()
  ));

create policy "Stylists can respond to reviews"
  on reviews for update
  using (true);

-- Portfolio items policies
create policy "Public can view portfolio items"
  on portfolio_items for select
  using (true);

create policy "Stylists can manage own portfolio"
  on portfolio_items for all
  using (stylist_id in (
    select id from stylists where user_id = auth.uid()
  ));

-- Messages policies
create policy "Users can view own messages"
  on messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can send messages"
  on messages for insert
  with check (sender_id = auth.uid());

create policy "Users can mark own messages as read"
  on messages for update
  using (receiver_id = auth.uid());

-- Intake responses policies
create policy "Clients can view own intake responses"
  on intake_responses for select
  using (appointment_id in (
    select a.id from appointments a
    join clients c on a.client_id = c.id
    where c.user_id = auth.uid()
  ));

create policy "Stylists can view intake responses"
  on intake_responses for select
  using (true);

create policy "System can insert intake responses"
  on intake_responses for insert
  with check (true);
