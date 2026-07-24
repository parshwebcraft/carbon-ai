insert into public.companies (name, slug, brand_name, website)
values ('ParshWebCraft', 'parshwebcraft', 'ParshWebCraft', 'https://parshwebcraft.com')
on conflict (slug) do nothing;

insert into public.business_profiles (
  company_id,
  about_company,
  mission,
  vision,
  services,
  usp,
  website,
  industries_served,
  languages,
  working_process,
  payment_terms,
  support_hours
)
select
  id,
  'ParshWebCraft is a web and software digital agency focused on websites, ecommerce, SEO, digital marketing, hosting, branding, and business automation.',
  'Help businesses grow with practical digital products and AI-enabled workflows.',
  'Become a trusted digital transformation partner for service businesses and growing brands.',
  '["Website Development","Ecommerce","SEO","Digital Marketing","Hosting","Branding","Automation"]'::jsonb,
  'Full-stack web, CRM, automation, and AI calling solutions from one partner.',
  'https://parshwebcraft.com',
  '["Local Businesses","Service Companies","Retail","Education","Healthcare","Real Estate","Agencies"]'::jsonb,
  '["English","Hindi"]'::jsonb,
  'Discovery, proposal, design, development, review, launch, and ongoing support.',
  'Project terms are confirmed in the proposal. Milestone payments may apply.',
  'Business-hours support with priority support for active retainers.'
from public.companies
where slug = 'parshwebcraft'
on conflict (company_id) do nothing;

insert into public.sales_playbooks (company_id, name, description, is_default)
select id, 'ParshWebCraft Default Sales Playbook', 'Default AI sales calling flow for ParshWebCraft.', true
from public.companies
where slug = 'parshwebcraft'
on conflict (company_id, name) do nothing;

insert into public.sales_playbook_stages (playbook_id, stage_name, sort_order, goal, prompt)
select p.id, stage_name, sort_order, goal, prompt
from public.sales_playbooks p
cross join (
  values
    ('Greeting', 10, 'Open the call politely and confirm availability.', 'Introduce ParshWebCraft and ask if this is a good time.'),
    ('Discovery', 20, 'Understand the business and current digital presence.', 'Ask what business they run and what they want to improve.'),
    ('Qualification', 30, 'Identify fit, urgency, and decision process.', 'Ask about goals, timeline, budget range, and who will approve.'),
    ('Need Analysis', 40, 'Map pain points to services.', 'Recommend website, ecommerce, SEO, marketing, hosting, branding, or automation based on need.'),
    ('Budget Discussion', 50, 'Qualify budget respectfully.', 'Discuss budget range without pressure and explain value.'),
    ('Proposal', 60, 'Offer the right next commercial step.', 'Suggest a proposal or audit based on their requirements.'),
    ('Objection Handling', 70, 'Resolve concerns using approved responses.', 'Handle price, timing, trust, and comparison objections.'),
    ('Meeting Booking', 80, 'Book a meeting with a human sales expert.', 'Offer two meeting slots and confirm contact details.'),
    ('Follow-up', 90, 'Confirm next action and channel.', 'Ask whether to send details on WhatsApp or email.'),
    ('Closing', 100, 'Close clearly and update CRM.', 'Summarize outcome, thank them, and confirm the next step.')
) as s(stage_name, sort_order, goal, prompt)
where p.is_default = true
on conflict (playbook_id, stage_name) do nothing;

insert into public.objections (company_id, objection, recommended_response, alternative_response, escalation_rule, success_rate)
select c.id, objection, recommended_response, alternative_response, escalation_rule, success_rate
from public.companies c
cross join (
  values
    ('Too expensive', 'I understand. The price depends on scope, but we can suggest a practical starting package focused on your highest-priority goal.', 'We can also phase the work so you do not need to invest everything upfront.', 'Escalate if the customer asks for a custom discount or exact quote.', 0),
    ('Need to think', 'Of course. What would help you decide: examples, pricing, timeline, or a short consultation?', 'I can send a concise summary and arrange a quick follow-up.', 'Escalate if the customer wants a proposal review.', 0),
    ('Already working with someone', 'That is fine. Many clients come to us for a second opinion, speed, SEO, automation, or ongoing support gaps.', 'We can review what is working and where we may add value.', 'Escalate if they mention an active vendor contract.', 0),
    ('Send details on WhatsApp', 'Sure, I can send details on WhatsApp. May I also confirm what service you are most interested in so I send the right information?', 'I will send only the relevant details instead of a generic brochure.', 'Create WhatsApp follow-up task.', 0),
    ('No budget', 'I understand. We can start with a smaller improvement plan or schedule a free discovery call for future planning.', 'Even a basic audit can help you plan the right budget.', 'Mark as nurture unless a meeting is requested.', 0),
    ('Not interested', 'No problem. Before I close this, is it because you already have a solution or because this is not a priority right now?', 'Thanks for your time. I can keep this short and close the loop.', 'Close lead if they repeat no interest.', 0)
) as o(objection, recommended_response, alternative_response, escalation_rule, success_rate)
where c.slug = 'parshwebcraft'
on conflict (company_id, objection) do nothing;
